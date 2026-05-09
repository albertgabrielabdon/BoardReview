const StreakLogic = {
    TEST_MODE: false,
    /**
     * @param {Object} currentStreak
     * @returns {Object|null}
     */
    calculateUpdate(currentStreak) {
        const now = new Date();
        if (this.TEST_MODE) {
            const nowMin = Math.floor(now.getTime() / 60000); 
            const lastMin = currentStreak.lastCompletedDate ? parseInt(currentStreak.lastCompletedDate) : null;

            if (lastMin === nowMin) return null;
            let updated = { ...currentStreak };
            
            if (lastMin === nowMin - 1) {
                updated.current += 1;
            } else {
                updated.current = 1; 
            }

            updated.lastCompletedDate = nowMin.toString();
            if (updated.current > updated.longest) updated.longest = updated.current;
            return updated;
        }
        const today = now.toISOString().split('T')[0];
        const last = currentStreak.lastCompletedDate;

        if (last === today) return null;

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let updated = { ...currentStreak };

        if (last === yesterdayStr) {
            updated.current += 1;
        } else {
  
            if (updated.streakFreezes > 0 && last !== null) {
                updated.streakFreezes -= 1;
                updated.current += 1; 
            } else {
                updated.current = 1; 
            }
        }

        updated.lastCompletedDate = today;
        updated.totalStudyDays += 1;
        if (updated.current > updated.longest) updated.longest = updated.current;
        
        return updated;
    }
};

window.CloudSync = {
    API_URL: "https://script.google.com/macros/s/AKfycbz2yOS95b9c6HpJVUSz3S1Hk5aOo_QHqOERMhALO62G7Q9_lgQJLmK27234cOjd47pD/exec",

    async pull(username) {
        try {
            const response = await fetch(`${this.API_URL}?username=${encodeURIComponent(username)}`);
            const cloudData = await response.json();
    
            if (cloudData && cloudData.status !== "not_found") {
                DB.stats.xp = cloudData.xp || 0;
                DB.stats.sync.version = cloudData.version || 0;
                
                let streak = cloudData.streak;
    
                if (streak.lastCompletedDate) {
                    if (StreakLogic.TEST_MODE) {
                        const lastMin = parseInt(streak.lastCompletedDate);
                        const lastDate = new Date(lastMin * 60000); 
                        
                        lastDate.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
    
                        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 1) {
                            streak.current = 0;
                            console.log("Test Mode: Streak expired (checked by days).");
                        } else {
                            console.log(`Test Mode: Streak valid. Days since last: ${diffDays}`);
                        }
                    } else {
                        const lastDate = new Date(streak.lastCompletedDate);
                        lastDate.setHours(0,0,0,0);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        
                        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                        if (diffDays > 1) {
                            streak.current = 0;
                            console.log("Real: Streak expired (days).");
                        }
                    }
                }
                
                DB.stats.streak = streak;
                Utils.saveDB();
                console.log("Cloud Sync: Pull successful");
                return true;
            }
        } catch (e) {
            console.error("Cloud Sync: Pull failed", e);
        }
        return false;
    },

    async push() {
        if (!window.DB || !DB.stats.sync || !DB.stats.sync.username) {
            console.log("Push aborted: No username found.");
            return;
        }
        
        DB.stats.sync.version = (DB.stats.sync.version || 0) + 1;
        Utils.saveDB();
    
        const payload = {
            action: "push_stats",
            username: DB.stats.sync.username,
            streak: JSON.stringify(DB.stats.streak),
            xp: DB.stats.xp || 0,
            version: DB.stats.sync.version
        };
    
        console.log("Attempting Cloud Push for:", payload.username);
    
        try {
            const formBody = Object.keys(payload)
                .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(payload[key]))
                .join('&');
    
            await fetch(this.API_URL, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody
            });
            
            console.log("Cloud Push Sent. Check Google Sheet in 5 seconds.");
        } catch (e) { 
            console.error("Cloud Push Failed:", e);
        }
    }
};

