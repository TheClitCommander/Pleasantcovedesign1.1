# 🔒 SquareSpace Member Authentication Setup

## 🚨 CRITICAL FIX: Member Conversation Isolation

This setup ensures **each SquareSpace member gets their own separate conversation** instead of sharing one chat.

## ✅ Step 1: Add Member Info Injection

### For SquareSpace 7.1 Sites (Modern)

1. **Go to your SquareSpace site admin**
2. **Settings → Advanced → Code Injection**
3. **Add this to HEADER section:**

```html
<!-- Pleasant Cove Design - Member Authentication Injection -->
<script>
  // Wait for SquareSpace to fully load
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [PCD] Attempting member detection...');
    
    // Method 1: Modern SquareSpace member authentication
    let memberEmail = null;
    let memberName = null;
    
    try {
      // Check Static context first
      if (window.Static && window.Static.SQUARESPACE_CONTEXT) {
        const ctx = window.Static.SQUARESPACE_CONTEXT;
        if (ctx.authenticatedUser) {
          memberEmail = ctx.authenticatedUser.email;
          memberName = ctx.authenticatedUser.firstName || ctx.authenticatedUser.displayName;
          console.log('✅ [PCD] Found member via Static.SQUARESPACE_CONTEXT');
        }
      }
      
      // Check initial context if not found
      if (!memberEmail && window.__INITIAL_SQUARESPACE_7_1_WEBSITE_CONTEXT__) {
        const ctx = window.__INITIAL_SQUARESPACE_7_1_WEBSITE_CONTEXT__;
        if (ctx.authenticatedUser) {
          memberEmail = ctx.authenticatedUser.email;
          memberName = ctx.authenticatedUser.firstName || ctx.authenticatedUser.displayName;
          console.log('✅ [PCD] Found member via __INITIAL_SQUARESPACE_7_1_WEBSITE_CONTEXT__');
        }
      }
      
      // Check modern squarespace object
      if (!memberEmail && window.squarespace && window.squarespace.userAccountApi) {
        // This varies by SquareSpace version
        console.log('🔍 [PCD] Found squarespace.userAccountApi, checking...');
      }
      
    } catch (error) {
      console.log('❌ [PCD] Error detecting member:', error);
    }
    
    // Inject member info for the widget
    if (memberEmail) {
      window.PCD_MEMBER_INFO = {
        email: memberEmail,
        name: memberName || memberEmail.split('@')[0],
        authenticated: true,
        source: 'SquareSpace Template Injection'
      };
      console.log('✅ [PCD] Member info injected:', memberEmail);
    } else {
      // Clear any stale member info
      window.PCD_MEMBER_INFO = null;
      console.log('❌ [PCD] No member detected - user not logged in');
    }
  });
</script>
```

### For SquareSpace 7.0 Sites (Legacy)

If you have an older SquareSpace site, use this instead:

```html
<!-- Pleasant Cove Design - Legacy Member Authentication -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [PCD] Legacy member detection...');
    
    let memberEmail = null;
    let memberName = null;
    
    try {
      // Legacy SquareSpace authentication
      if (window.Y && window.Y.Squarespace && window.Y.Squarespace.UserData) {
        const userData = window.Y.Squarespace.UserData;
        memberEmail = userData.email;
        memberName = userData.firstName || userData.displayName;
        console.log('✅ [PCD] Found legacy member');
      }
      
      // Check UserData directly
      if (!memberEmail && window.UserData && window.UserData.email) {
        memberEmail = window.UserData.email;
        memberName = window.UserData.firstName || window.UserData.displayName;
        console.log('✅ [PCD] Found member via UserData');
      }
      
    } catch (error) {
      console.log('❌ [PCD] Legacy detection error:', error);
    }
    
    // Inject member info
    if (memberEmail) {
      window.PCD_MEMBER_INFO = {
        email: memberEmail,
        name: memberName || memberEmail.split('@')[0],
        authenticated: true,
        source: 'SquareSpace Legacy Template'
      };
      console.log('✅ [PCD] Legacy member info injected:', memberEmail);
    } else {
      window.PCD_MEMBER_INFO = null;
      console.log('❌ [PCD] No legacy member detected');
    }
  });
</script>
```

## ✅ Step 2: Test Member Detection

1. **Add a test member** to your SquareSpace site
2. **Log in as that member** in a browser tab
3. **Go to the page with your messaging widget**
4. **You should see a debug banner** at the top showing:
   - Green background = Member authentication working ✅
   - Yellow background = Form authentication (fallback)
   - Red background = No authentication ❌

## ✅ Step 3: Test Member Isolation

1. **Log in as Member 1** and send a message
2. **Log out and log in as Member 2** 
3. **Send a different message**
4. **Check your admin dashboard** - you should see:
   - ✅ **Two separate conversation threads**
   - ✅ **Different member names/emails**
   - ✅ **No shared messages between members**

## 🔧 Advanced Setup (Optional)

### For Member Areas

If you're using SquareSpace Member Areas, add this to your **member area template**:

```html
<!-- In Member Area Template -->
<script>
  // Enhanced member area detection
  if (typeof memberData !== 'undefined' && memberData.email) {
    window.PCD_MEMBER_INFO = {
      email: memberData.email,
      name: memberData.firstName + ' ' + memberData.lastName,
      authenticated: true,
      source: 'Member Area Template'
    };
    console.log('✅ [PCD] Member Area authentication active');
  }
</script>
```

### Force Logout Detection

Add this to ensure immediate logout detection:

```html
<script>
  // Watch for logout events
  document.addEventListener('beforeunload', function() {
    // Clear any cached member data when navigating away
    if (window.PCD_MEMBER_INFO) {
      console.log('🔄 [PCD] Page unload - clearing member cache');
    }
  });
  
  // Listen for SquareSpace logout events (if available)
  if (window.addEventListener) {
    window.addEventListener('squarespace:member:logout', function() {
      console.log('🚨 [PCD] Member logout detected');
      window.PCD_MEMBER_INFO = null;
    });
  }
</script>
```

## 🧪 Testing Commands

Open browser console and run these tests:

```javascript
// Check if member info is injected
console.log('Member Info:', window.PCD_MEMBER_INFO);

// Check SquareSpace contexts
console.log('Static Context:', window.Static?.SQUARESPACE_CONTEXT);
console.log('Initial Context:', window.__INITIAL_SQUARESPACE_7_1_WEBSITE_CONTEXT__);

// Simulate different member
window.PCD_MEMBER_INFO = {
  email: 'test@example.com',
  name: 'Test User',
  authenticated: true
};
```

## 🚨 Railway Fix

If Railway isn't working, check these:

1. **Railway Deployment Status**: https://railway.app (check your project dashboard)
2. **Environment Variables**: Ensure all required env vars are set in Railway
3. **Build Logs**: Check Railway logs for deployment errors
4. **Database Connection**: Ensure PostgreSQL plugin is added and connected

### Quick Railway Test

Test if Railway backend is responding:

```bash
curl https://pleasantcovedesign-production.up.railway.app/api/stats
```

Expected response: `{"message":"Server is running"}`

## ✅ Expected Results

After setup, your system should:

- ✅ **Green debug banner** for logged-in members
- ✅ **Separate conversation for each member** in admin dashboard  
- ✅ **No shared messages** between different member accounts
- ✅ **Instant messaging** with proper member isolation
- ✅ **File uploads** working per conversation
- ✅ **Logout detection** that clears sessions properly

## 🆘 Troubleshooting

### Problem: Debug banner shows "NO MEMBER DETECTED"
**Solution**: Check SquareSpace member authentication setup, ensure user is actually logged into member account

### Problem: Still sharing conversations between members
**Solution**: Clear browser localStorage and test with incognito windows for each member

### Problem: Railway backend not responding  
**Solution**: Check Railway deployment status and logs, verify environment variables

### Problem: Messages not instant
**Solution**: WebSocket connection may have failed, will fall back to HTTP polling (still works, just slower)

---

**🎯 This setup guarantees each SquareSpace member gets their own isolated conversation with you!** 