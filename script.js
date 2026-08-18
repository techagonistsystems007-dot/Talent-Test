const scriptURL = "https://script.google.com/macros/s/AKfycbwCume2In8Qks285sDLdBJhXwoUs1WyHBggpsq6DZbAoMqcf6TORGXt9rnt33PDbHXh/exec";
const certVerificationURL = "https://certificate-verification.pharma2tech.in/";

let questions = [], curIdx = 0, userAns = [], student = {}, testTitle = "", malCount = 0, historyData = [];
let examTargetTime = null, timerInterval = null;
let questionStatus = [];

// BLOCK KEYBOARD SHORTCUTS
document.addEventListener('keydown', function(e) {
    if (e.keyCode == 123 || 
       (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || 
       (e.ctrlKey && (e.keyCode == 85 || e.keyCode == 67))) {
        e.preventDefault();
        alert("Security Alert: Keyboard shortcuts are disabled!");
        return false;
    }
});

window.onload = async () => {
    try {
        const res = await fetch(`${scriptURL}?action=getQuestions`);
        const data = await res.json();
        questions = data.questions || [];
        testTitle = data.title || "National Talent Test";
        document.getElementById('displayTitle').innerText = testTitle;
        
        if(data.startTime) {
            parseAndStartTimer(data.startTime);
        } else {
            enableExamButton();
        }
    } catch(e) { 
        document.getElementById('displayTitle').innerText = "Online Assessment";
        enableExamButton();
    }
};

function parseAndStartTimer(dateTimeStr) {
    try {
        dateTimeStr = dateTimeStr.trim();
        let parsedDate = null;

        const isPM = /pm/i.test(dateTimeStr);
        const isAM = /am/i.test(dateTimeStr);
        let cleanStr = dateTimeStr.replace(/am|pm/i, '').trim();

        let parts = cleanStr.split(/\s+/);
        if (parts.length >= 2) {
            let datePart = parts[0];
            let timePart = parts[1];

            let dateElems = datePart.split(/[\/\-]/);
            let timeElems = timePart.split(':');

            if (dateElems.length === 3 && timeElems.length >= 2) {
                let day = parseInt(dateElems[0], 10);
                let month = parseInt(dateElems[1], 10) - 1;
                let year = parseInt(dateElems[2], 10);

                let hours = parseInt(timeElems[0], 10);
                let minutes = parseInt(timeElems[1], 10);
                let seconds = timeElems[2] ? parseInt(timeElems[2], 10) : 0;

                if (isPM && hours < 12) hours += 12;
                if (isAM && hours === 12) hours = 0;

                parsedDate = new Date(year, month, day, hours, minutes, seconds);
            }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
            parsedDate = new Date(dateTimeStr);
        }

        if (parsedDate && !isNaN(parsedDate.getTime())) {
            examTargetTime = parsedDate;

            let h = examTargetTime.getHours();
            let m = examTargetTime.getMinutes();
            let ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12; h = h ? h : 12;
            m = m < 10 ? '0' + m : m;

            let formattedStartTime = `${examTargetTime.getDate()}/${examTargetTime.getMonth()+1}/${examTargetTime.getFullYear()} at ${h}:${m} ${ampm}`;
            document.getElementById('scheduledTimeText').innerText = "Scheduled Start Time: " + formattedStartTime;

            updateCountdown();
            if(timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateCountdown, 1000);
        } else {
            enableExamButton();
        }
    } catch(err) {
        enableExamButton();
    }
}

function updateCountdown() {
    if(!examTargetTime) return;

    const now = new Date().getTime();
    const distance = examTargetTime.getTime() - now;

    if (distance <= 0) {
        clearInterval(timerInterval);
        enableExamButton();
        return;
    }

    document.getElementById('timerContainer').style.display = 'flex';

    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const hStr = hours < 10 ? "0" + hours : hours;
    const mStr = minutes < 10 ? "0" + minutes : minutes;
    const sStr = seconds < 10 ? "0" + seconds : seconds;

    document.getElementById('countdownDisplay').innerText = `${hStr}h : ${mStr}m : ${sStr}s`;
}

function enableExamButton() {
    document.getElementById('timerContainer').style.display = 'none';
    const startBtn = document.getElementById('startExamBtn');
    startBtn.innerText = "Login & Start Exam";
    startBtn.disabled = false;
    startBtn.classList.remove('btn-disabled');
}

function switchAuthMode(mode) {
    if(mode === 'LOGIN') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginTabBtn').classList.add('active');
        document.getElementById('regTabBtn').classList.remove('active');
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('regTabBtn').classList.add('active');
        document.getElementById('loginTabBtn').classList.remove('active');
    }
}

async function handleRegistration() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const college = document.getElementById('regCollege').value.trim();
    const city = document.getElementById('regCity').value.trim();
    const state = document.getElementById('regState').value.trim();

    if(!name || !email || !phone || !college || !city || !state) {
        return alert("Please fill all details!");
    }

    showLoader();
    try {
        const payload = { action: "register", name, email, phone, college, city, state };
        const res = await fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) });
        const text = await res.text();

        hideLoader();
        if(text === "EXISTS") {
            alert("Email or Phone number is already registered!");
        } else if(text === "REGISTERED_SUCCESS") {
            alert("Registration Successful!\n\nYou can now Login using:\nEmail: " + email + "\nPassword: " + phone);
            document.getElementById('email').value = email;
            document.getElementById('pass').value = phone;
            switchAuthMode('LOGIN');
        } else {
            alert("Registration Failed. Try again.");
        }
    } catch(e) {
        hideLoader();
        alert("Error registering candidate.");
    }
}

async function handleLogin(mode) {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    if(!email || !pass) return alert("Credentials required");

    showLoader();
    try {
        const url = `${scriptURL}?action=login&email=${encodeURIComponent(email)}&pass=${encodeURIComponent(pass)}&mode=${mode}&examTitle=${encodeURIComponent(testTitle)}`;
        const res = await fetch(url);
        const text = await res.text();
        
        if(text === "INVALID") {
            alert("Invalid Credentials!");
            hideLoader();
        } else if(text === "ALREADY_GIVEN") {
            alert("You have already submitted THIS exam (" + testTitle + "). You can only view results now.");
            hideLoader();
        } else {
            try {
                student = JSON.parse(text);
                document.getElementById('headerName').innerText = student.name;
                document.getElementById('userInfo').style.display = "block";
                if(mode === 'START') {
                    startExam();
                    hideLoader();
                } else {
                    await fetchHistory(email);
                }
            } catch(e) { alert("Login Error"); hideLoader(); }
        }
    } catch(e) { 
        alert("Server Error"); 
        hideLoader();
    }
}

function startExam() {
    if(!questions || questions.length === 0) {
        alert("No questions available at the moment.");
        return;
    }

    requestFullScreen();

    const savedDraft = localStorage.getItem(`p2t_exam_${student.email}_${testTitle}`);
    if(savedDraft) {
        if(confirm("आपली अर्धवट राहिलेली परीक्षा सापडली आहे. तिथूनच Resume करायची आहे का?")) {
            const parsed = JSON.parse(savedDraft);
            userAns = parsed.userAns || [];
            questionStatus = parsed.questionStatus || [];
            curIdx = parsed.curIdx || 0;
        } else {
            localStorage.removeItem(`p2t_exam_${student.email}_${testTitle}`);
            questionStatus = new Array(questions.length).fill('not-visited');
        }
    } else {
        questionStatus = new Array(questions.length).fill('not-visited');
    }
    
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('examCard').style.display = 'block';
    renderQuestion();
}

function requestFullScreen() {
    let elem = document.documentElement;
    if (elem.requestFullscreen) { elem.requestFullscreen().catch(err => {}); } 
    else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); } 
    else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
}

document.addEventListener("visibilitychange", triggerMalpractice);
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.getElementById('examCard').style.display === "block") {
        triggerMalpractice();
    }
});

function triggerMalpractice() {
    if (document.getElementById('examCard').style.display === "block") {
        malCount++;
        document.getElementById('malpracticeWarning').style.display = "block";
        if(malCount >= 3) {
            alert("Auto-submitting exam due to multiple malpractice warnings.");
            submitExam(true);
        }
    }
}

function togglePalette() {
    const content = document.getElementById('paletteContent');
    const icon = document.getElementById('paletteToggleIcon');
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        icon.innerText = "▼ Show";
    } else {
        content.classList.add('open');
        icon.innerText = "▲ Hide";
    }
}

function saveDraftLocally() {
    if(student.email) {
        const draftData = { userAns: userAns, questionStatus: questionStatus, curIdx: curIdx };
        localStorage.setItem(`p2t_exam_${student.email}_${testTitle}`, JSON.stringify(draftData));
    }
}

function renderQuestion() {
    const q = questions[curIdx];
    const isLast = curIdx === questions.length - 1;
    const savedAnswer = userAns[curIdx] ? userAns[curIdx].uSelected : "";

    if (questionStatus[curIdx] === 'not-visited') {
        questionStatus[curIdx] = 'unattempted';
    }

    document.getElementById('qContainer').innerHTML = `
        <p style="color:var(--primary); font-weight:600; margin-bottom:5px; font-size:0.85rem;">Question ${curIdx+1} of ${questions.length}</p>
        <h3 style="margin-bottom:12px; line-height: 1.35; font-size:0.98rem;">${q[1]}</h3>
        <label class="option"><input type="radio" name="opt" value="A" ${savedAnswer === 'A' ? 'checked' : ''} onchange="autoSaveOption('A')"> A. ${q[2]}</label>
        <label class="option"><input type="radio" name="opt" value="B" ${savedAnswer === 'B' ? 'checked' : ''} onchange="autoSaveOption('B')"> B. ${q[3]}</label>
        <label class="option"><input type="radio" name="opt" value="C" ${savedAnswer === 'C' ? 'checked' : ''} onchange="autoSaveOption('C')"> C. ${q[4]}</label>
        <label class="option"><input type="radio" name="opt" value="D" ${savedAnswer === 'D' ? 'checked' : ''} onchange="autoSaveOption('D')"> D. ${q[5]}</label>
    `;

    document.getElementById('prevBtn').style.display = curIdx > 0 ? "inline-block" : "none";

    const reviewBtn = document.getElementById('reviewBtn');
    if (questionStatus[curIdx] === 'review') {
        reviewBtn.innerHTML = "Unmark";
        reviewBtn.style.background = "#64748b";
    } else {
        reviewBtn.innerHTML = "🟣 Review";
        reviewBtn.style.background = "var(--review)";
    }

    const mainBtn = document.getElementById('mainBtn');
    if(isLast) {
        mainBtn.innerText = "Submit";
        mainBtn.className = "btn btn-start";
    } else {
        mainBtn.innerHTML = "Next &rarr;";
        mainBtn.className = "btn btn-next";
    }

    renderPalette();
    saveDraftLocally();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function autoSaveOption(val) {
    const q = questions[curIdx];
    userAns[curIdx] = {
        qText: q[1],
        options: { A: q[2], B: q[3], C: q[4], D: q[5] },
        uSelected: val,
        correctOpt: String(q[6]).trim(),
        explanation: q[7] || "No explanation available."
    };
    if (questionStatus[curIdx] !== 'review') {
        questionStatus[curIdx] = 'attempted';
    }
    renderPalette();
    saveDraftLocally();
}

function toggleMarkForReview() {
    if (questionStatus[curIdx] === 'review') {
        questionStatus[curIdx] = userAns[curIdx] && userAns[curIdx].uSelected ? 'attempted' : 'unattempted';
    } else {
        questionStatus[curIdx] = 'review';
    }
    renderQuestion();
}

function renderPalette() {
    let paletteHtml = "";
    for (let i = 0; i < questions.length; i++) {
        let status = questionStatus[i] || 'not-visited';
        let activeClass = i === curIdx ? 'active' : '';
        
        paletteHtml += `
            <div class="p-box ${status} ${activeClass}" onclick="jumpToQuestion(${i})">
                ${i + 1}
            </div>
        `;
    }
    document.getElementById('paletteGrid').innerHTML = paletteHtml;
}

function jumpToQuestion(idx) {
    curIdx = idx;
    renderQuestion();
    if (window.innerWidth <= 768) {
        const content = document.getElementById('paletteContent');
        if (content) content.classList.remove('open');
        document.getElementById('paletteToggleIcon').innerText = "▼ Show";
    }
}

function nextQuestion() {
    if(curIdx < questions.length - 1) {
        curIdx++; 
        renderQuestion();
    } else { 
        if(confirm("Are you sure you want to submit the exam?")) submitExam(false); 
    }
}

function prevQuestion() {
    if(curIdx > 0) {
        curIdx--;
        renderQuestion();
    }
}

async function submitExam(isMal) {
    showLoader();
    let score = 0;
    
    let finalResponses = [];
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const ans = userAns[i] ? userAns[i].uSelected : "";
        if (ans === String(q[6]).trim()) score++;

        finalResponses.push({
            qText: q[1],
            options: { A: q[2], B: q[3], C: q[4], D: q[5] },
            uSelected: ans,
            correctOpt: String(q[6]).trim(),
            explanation: q[7] || "No explanation available."
        });
    }

    const payload = {
        studentId: student.email, studentName: student.name, examTitle: testTitle,
        score: score, total: questions.length, wrong: questions.length - score,
        status: isMal ? "FAILED (Malpractice)" : "COMPLETED", 
        responses: finalResponses 
    };

    try {
        await fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) });
        localStorage.removeItem(`p2t_exam_${student.email}_${testTitle}`);
        hideLoader();
        showResult(score, questions.length, isMal);
    } catch(e) { location.reload(); }
}

function showResult(s, t, isMal) {
    document.getElementById('examCard').style.display = 'none';
    document.getElementById('resultCard').style.display = 'block';
    const percentage = Math.round((s/t)*100);
    
    let badge = "🥇 Gold Performer";
    if(percentage < 60) badge = "🥉 Bronze Performer";
    else if(percentage < 80) badge = "🥈 Silver Performer";

    let certBtnHtml = "";
    if (isMal) {
        certBtnHtml = `
            <div class="btn btn-cert-portal btn-cert-locked">
                🔒 Certificate Locked (Violation Detected)
            </div>
            <p style="font-size:0.75rem; color:var(--danger); margin-top:6px; font-weight:600;">
                ⚠️ Malpractice / Tab Switching rules were violated. Certificate issuance is permanently disabled for this attempt.
            </p>`;
    } else {
        certBtnHtml = `
            <a href="${certVerificationURL}" target="_blank" class="btn btn-cert-portal">
                📜 Get Verified Scorecard & Certificate &rarr;
            </a>
            <p style="font-size:0.75rem; color:#64748b; margin-top:6px;">Click above to download your verified certificate from the official portal.</p>`;
    }

    document.getElementById('resultCard').innerHTML = `
        <h2 style="margin-bottom:10px; color: var(--primary);">Assessment Scorecard Summary</h2>
        ${isMal ? '<p style="color:var(--danger); font-weight:bold; font-size:0.85rem; margin-bottom:10px;">⚠️ EXAM AUTO-SUBMITTED DUE TO RULE VIOLATION</p>' : ''}
        
        <div style="font-size:0.85rem; font-weight:600; color:var(--gold); margin-bottom:15px; background:#fffbe8; padding:5px 12px; border-radius:15px; display:inline-block; border:1px solid #fde68a;">${badge}</div>
        
        <div style="position: relative; width: 150px; height: 150px; margin: 0 auto 20px;">
            <canvas id="resultChart"></canvas>
            <div style="position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                <span style="font-size:1.5rem; font-weight:700; color:var(--dark);">${percentage}%</span>
            </div>
        </div>

        <div style="background: #f8fafc; padding: 18px; border-radius: 12px; text-align:left; max-width:400px; margin: 0 auto 20px; border: 1px solid #e2e8f0; font-size:0.9rem;">
            <p style="margin-bottom:6px;"><b>Candidate:</b> ${student.name}</p>
            <p style="margin-bottom:6px;"><b>Exam:</b> ${testTitle}</p>
            <p style="margin-bottom:6px;"><b>Total Questions:</b> ${t}</p>
            <p style="margin-bottom:6px;"><b>Correct Answers:</b> <span style="color:var(--success); font-weight:bold;">${s}</span></p>
            <p style="margin-bottom:6px;"><b>Wrong Answers:</b> <span style="color:var(--danger); font-weight:bold;">${t - s}</span></p>
            <p><b>Status:</b> ${isMal ? '<span style="background:var(--danger); color:white; padding:2px 8px; border-radius:4px; font-size:0.78rem;">FAILED (Malpractice)</span>' : '<span style="background:var(--success); color:white; padding:2px 8px; border-radius:4px; font-size:0.78rem;">OFFICIALLY VERIFIED</span>'}</p>
        </div>

        <div style="max-width:400px; margin: 0 auto 15px;">
            ${certBtnHtml}
        </div>

        <button class="btn btn-view" style="width: 100%; max-width:400px; background:#64748b;" onclick="location.reload()">Finish & Exit</button>
    `;

    const ctx = document.getElementById('resultChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Incorrect'],
            datasets: [{ 
                data: [s, t - s], 
                backgroundColor: ['#28a745', '#dc3545'], 
                borderWidth: 0, 
                cutout: '80%',
                hoverOffset: 4
            }]
        },
        options: { 
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            maintainAspectRatio: false
        }
    });
}

async function fetchHistory(email) {
    const res = await fetch(`${scriptURL}?action=fetchHistory&email=${encodeURIComponent(email)}`);
    historyData = await res.json();
    showHistoryList();
    hideLoader();
}

function showHistoryList() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('reviewCard').style.display = 'none';
    document.getElementById('historyCard').style.display = 'block';
    
    let html = "";
    historyData.forEach((item, idx) => {
        let isMal = item.status && item.status.includes("Malpractice");
        
        let certActionHtml = isMal 
            ? `<div class="btn btn-cert-portal btn-cert-locked" style="flex:1; margin:0; padding:8px 12px; font-size:0.75rem;">🔒 Cert Locked</div>`
            : `<a href="${certVerificationURL}" target="_blank" class="btn btn-cert-portal" style="flex:1; margin:0; padding:8px 12px; font-size:0.8rem;">📜 Certificate</a>`;

        html += `
        <div class="history-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <b style="color:var(--dark); font-size:0.95rem;">${item.title}</b><br>
                    <small style="color:#64748b">Completed on: ${new Date(item.date).toLocaleDateString()}</small>
                </div>
                <div style="color:var(--primary); font-weight:700; font-size:1rem;">
                    Score: ${item.score}/${item.total}
                </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:5px;">
                <button class="btn btn-view" style="flex:1; margin:0; padding:8px 12px; font-size:0.8rem;" onclick="viewReview(${idx})">🔍 View Review</button>
                ${certActionHtml}
            </div>
        </div>`;
    });
    document.getElementById('historyList').innerHTML = html || "<p style='color:#64748b; padding:20px;'>No previous exam records found for this account.</p>";
}

function viewReview(idx) {
    const ex = historyData[idx];
    document.getElementById('historyCard').style.display = 'none';
    document.getElementById('reviewCard').style.display = 'block';
    document.getElementById('revExamTitle').innerText = ex.title + " - Review";

    let gridHtml = "", revDetails = "";
    
    ex.userResponses.forEach((item, i) => {
        let isCorrect = item.uSelected === item.correctOpt;
        gridHtml += `<div class="grid-box" style="background:${isCorrect?'var(--success)':'var(--danger)'}" onclick="document.getElementById('q-ref-${i}').scrollIntoView({behavior:'smooth'})">${i+1}</div>`;
        
        let optionsHtml = "";
        ['A', 'B', 'C', 'D'].forEach(optKey => {
            let statusClass = "";
            let labelPrefix = optKey + ". ";
            let optText = item.options ? item.options[optKey] : "Option " + optKey;

            if (optKey === item.correctOpt) statusClass = "correct";
            if (optKey === item.uSelected && !isCorrect) statusClass = "wrong";

            optionsHtml += `<div class="rev-opt ${statusClass}">${labelPrefix} ${optText}</div>`;
        });

        revDetails += `
            <div class="review-card" id="q-ref-${i}" style="border-left: 5px solid ${isCorrect?'var(--success)':'var(--danger)'}">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-weight:600; color:var(--primary)">Question ${i+1}</span>
                    <span style="color:${isCorrect?'green':'red'}; font-weight:600;">${isCorrect?'✓ Correct':'✗ Incorrect'}</span>
                </div>
                <p style="font-weight:600; font-size:0.95rem; margin-bottom:12px;">${item.qText}</p>
                <div class="options-review">${optionsHtml}</div>
                ${item.explanation ? `<div class="explanation-box"><b>Explanation:</b><br>${item.explanation}</div>` : ""}
            </div>`;
    });
    document.getElementById('analysisGrid').innerHTML = gridHtml;
    document.getElementById('reviewDetails').innerHTML = revDetails;
}

function showLoader() { document.getElementById('loading').style.display = 'flex'; }
function hideLoader() { document.getElementById('loading').style.display = 'none'; }
