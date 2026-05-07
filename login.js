function checkPass() {
    const pass = document.getElementById('pass-input').value;
    const gate = document.getElementById('login-gate');
    const app = document.getElementById('main-app');
    const error = document.getElementById('login-error');

    if (pass === "LeanneIsCool") {
        gate.style.opacity = "0";
        setTimeout(() => {
            gate.style.display = "none";
            app.style.display = "block";
        }, 400);
    } else {
        error.style.display = "block";
        document.getElementById('pass-input').value = "";
    }
}
document.getElementById('pass-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPass();
});