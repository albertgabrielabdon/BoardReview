window.checkPass = async function() { 
    const user = document.getElementById('user-input').value.trim();
    const pass = document.getElementById('pass-input').value;
    const gate = document.getElementById('login-gate');
    const app = document.getElementById('main-app');
    const error = document.getElementById('login-error');

    if (pass === "LeanneIsCool" && user !== "") {
        DB.stats.xp = 0;
        DB.stats.streak = { 
            current: 0, 
            longest: 0, 
            lastCompletedDate: null, 
            totalStudyDays: 0,
            streakFreezes: 1 
        };
        
        if (!DB.stats.sync) DB.stats.sync = { username: "", version: 0 };
        DB.stats.sync.username = user;
        DB.stats.sync.version = 0;
        
        Utils.saveDB();
        
        Utils.toast(`Syncing ${user}'s progress...`, 'info');

        if (window.CloudSync) {
            await CloudSync.pull(user);
        }

        gate.style.opacity = "0";
        setTimeout(() => {
            gate.style.display = "none";
            app.style.display = "block";
            if (window.UI) UI.updateSidebarStats();
        }, 400);
    } else {
        error.style.display = "block";
        error.textContent = user === "" ? "Please enter a username." : "Access Denied.";
    }

};

