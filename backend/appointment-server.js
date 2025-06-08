const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5174;

// Middleware - Fixed CORS configuration
app.use(cors({
    origin: true, // Allow all origins for testing
    methods: ['GET', 'POST', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning'],
    credentials: true
}));
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./appointments.db');

// Create appointments table
db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        businessName TEXT,
        services TEXT NOT NULL,
        projectDescription TEXT NOT NULL,
        budget TEXT NOT NULL,
        timeline TEXT NOT NULL,
        appointmentDate TEXT NOT NULL,
        appointmentTime TEXT NOT NULL,
        additionalNotes TEXT,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Email configuration (update with your SMTP settings)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'pleasantcovedesign@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Routes
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Book appointment
app.post('/api/book-appointment', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            businessName,
            services,
            projectDescription,
            budget,
            timeline,
            appointmentDate,
            appointmentTime,
            additionalNotes
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !services || !projectDescription || !budget || !timeline || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // **CHECK AVAILABILITY FIRST - Prevent double booking**
        console.log('🔍 Checking appointment availability...');
        
        // Check for existing appointments at the same date/time
        db.all(
            'SELECT * FROM appointments WHERE appointmentDate = ? AND appointmentTime = ? AND status != ?',
            [appointmentDate, appointmentTime, 'cancelled'],
            (err, existingAppointments) => {
                if (err) {
                    console.error('Database error checking availability:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to check availability' 
                    });
                }
                
                if (existingAppointments.length > 0) {
                    console.log('❌ Time slot conflict detected');
                    console.log('Conflicting appointments:', existingAppointments.map(apt => ({
                        id: apt.id,
                        date: apt.appointmentDate,
                        time: apt.appointmentTime,
                        client: `${apt.firstName} ${apt.lastName}`
                    })));
                    
                    return res.status(409).json({
                        success: false,
                        message: `Sorry, the ${appointmentTime} time slot on ${new Date(appointmentDate).toLocaleDateString()} is already booked. Please choose a different time.`,
                        error: 'TIME_SLOT_UNAVAILABLE',
                        availableAlternatives: [
                            '8:30 AM',
                            '9:00 AM'
                        ].filter(time => time !== appointmentTime) // Suggest the other time slot
                    });
                }
                
                                console.log('✅ Time slot is available, proceeding with booking...');
                
                // Insert into database
                const stmt = db.prepare(`
                    INSERT INTO appointments (
                        firstName, lastName, email, phone, businessName,
                        services, projectDescription, budget, timeline,
                        appointmentDate, appointmentTime, additionalNotes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                stmt.run(
                    firstName, lastName, email, phone, businessName || '',
                    services, projectDescription, budget, timeline,
                    appointmentDate, appointmentTime, additionalNotes || '',
                    async function(err) {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Failed to save appointment' 
                            });
                        }

                        const appointmentId = this.lastID;

                // Send confirmation emails
                try {
                    // Email to client
                    await transporter.sendMail({
                        from: '"Pleasant Cove Design" <pleasantcovedesign@gmail.com>',
                        to: email,
                        subject: 'Appointment Confirmation - Pleasant Cove Design',
                        html: `
                            <h2>Appointment Confirmed!</h2>
                            <p>Dear ${firstName} ${lastName},</p>
                            <p>Your consultation appointment has been confirmed for:</p>
                            <ul>
                                <li><strong>Date:</strong> ${appointmentDate}</li>
                                <li><strong>Time:</strong> ${appointmentTime}</li>
                                <li><strong>Services:</strong> ${services}</li>
                            </ul>
                            <p>We'll contact you shortly to discuss your project.</p>
                            <p>Best regards,<br>Pleasant Cove Design Team</p>
                        `
                    });

                    // Email to admin
                    await transporter.sendMail({
                        from: '"Appointment System" <pleasantcovedesign@gmail.com>',
                        to: 'pleasantcovedesign@gmail.com',
                        subject: `New Appointment - ${firstName} ${lastName}`,
                        html: `
                            <h2>New Appointment Booking</h2>
                            <h3>Contact Information:</h3>
                            <ul>
                                <li><strong>Name:</strong> ${firstName} ${lastName}</li>
                                <li><strong>Email:</strong> ${email}</li>
                                <li><strong>Phone:</strong> ${phone}</li>
                                <li><strong>Business:</strong> ${businessName || 'N/A'}</li>
                            </ul>
                            <h3>Project Details:</h3>
                            <ul>
                                <li><strong>Services:</strong> ${services}</li>
                                <li><strong>Description:</strong> ${projectDescription}</li>
                                <li><strong>Budget:</strong> ${budget}</li>
                                <li><strong>Timeline:</strong> ${timeline}</li>
                            </ul>
                            <h3>Appointment:</h3>
                            <ul>
                                <li><strong>Date:</strong> ${appointmentDate}</li>
                                <li><strong>Time:</strong> ${appointmentTime}</li>
                            </ul>
                            <p><strong>Additional Notes:</strong> ${additionalNotes || 'None'}</p>
                        `
                    });
                } catch (emailError) {
                    console.error('Email error:', emailError);
                    // Don't fail the appointment if email fails
                }

                        res.json({
                            success: true,
                            message: 'Appointment booked successfully',
                            appointmentId: appointmentId
                        });
                    }
                );

                stmt.finalize();
            }
        );

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error occurred' 
        });
    }
});

// Get availability for a specific date
app.get('/api/availability/:date', (req, res) => {
    const { date } = req.params;

    // Define business hours - only two slots
    const allSlots = ['8:30 AM', '9:00 AM'];

    // Query booked slots for this date
    db.all(
        'SELECT appointmentTime FROM appointments WHERE appointmentDate = ? AND status != ?',
        [date, 'cancelled'],
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to check availability' 
                });
            }

            const bookedSlots = rows.map(row => row.appointmentTime);
            const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

            res.json({
                success: true,
                date: date,
                availableSlots: availableSlots,
                bookedSlots: bookedSlots
            });
        }
    );
});

// Get all appointments (for admin dashboard)
app.get('/api/appointments', (req, res) => {
    db.all(
        'SELECT * FROM appointments ORDER BY appointmentDate DESC, appointmentTime DESC',
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch appointments' 
                });
            }

            res.json({
                success: true,
                appointments: rows
            });
        }
    );
});

// Update appointment status
app.patch('/api/appointments/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid status' 
        });
    }

    db.run(
        'UPDATE appointments SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to update appointment' 
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Appointment not found' 
                });
            }

            res.json({
                success: true,
                message: 'Appointment updated successfully'
            });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Appointment server running on port ${PORT}`);
    console.log(`📍 API endpoints:`);
    console.log(`   POST   /api/book-appointment`);
    console.log(`   GET    /api/availability/:date`);
    console.log(`   GET    /api/appointments`);
    console.log(`   PATCH  /api/appointments/:id/status`);
}); 