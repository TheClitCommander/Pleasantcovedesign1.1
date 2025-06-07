# Widget Troubleshooting Guide

## Current Status
The widget has been simplified to remove all validation. When you click "Next", you should see:
1. An alert saying "Next button clicked! Current step: 1"
2. Another alert saying "Should now be on step 2"
3. The form should advance to step 2

## If the form still doesn't advance:

### Test 1: Check if JavaScript is running
1. When you click "Next", do you see the alert boxes?
   - YES: JavaScript is working, move to Test 2
   - NO: JavaScript is blocked or not running

### Test 2: Check browser console
1. Right-click on the page → Inspect → Console
2. Look for any red error messages
3. Common errors:
   - "Cannot read property of null" - Element not found
   - "Syntax error" - Code has a typo
   - "Refused to execute" - Squarespace blocking scripts

### Test 3: Check if elements exist
1. In the browser console, type:
   ```javascript
   document.getElementById('firstName')
   ```
2. If it returns `null`, the form fields aren't loading properly

## Quick Fix Options:

### Option 1: Use inline onclick (most compatible)
Instead of using addEventListener, change the Next button to:
```html
<button type="button" class="btn btn-primary" onclick="window.nextStep()">Next</button>
```

### Option 2: Test outside Squarespace
1. Save the HTML file to your desktop
2. Open it directly in Chrome/Firefox
3. If it works there but not in Squarespace, it's a Squarespace issue

### Option 3: Use the simplest possible version
The widget now has NO validation - it should just work. If it doesn't, something else is blocking it.

## What the alerts tell us:
- **No alerts at all**: JavaScript isn't running
- **First alert only**: The nextStep function runs but crashes
- **Both alerts**: The function completes but the UI isn't updating

## Contact Support
If none of this works:
- Email: pleasantcovedesign@gmail.com
- Phone: (207) 380-5680
- We can do a screen share to debug together 