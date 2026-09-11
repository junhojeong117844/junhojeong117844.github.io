import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyCDGkY9opb9Eypv0jg0Fq7976Ay_T1gNVE",
    authDomain: "knu-hnpl.firebaseapp.com",
    projectId: "knu-hnpl",
    storageBucket: "knu-hnpl.firebasestorage.app",
    messagingSenderId: "474040702069",
    appId: "1:474040702069:web:809ced39b82478a4c6d43c",
    measurementId: "G-HHNMDDY8ND"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const editControls = document.getElementById("editControls");
const nameInput = document.getElementById("nameInput");
const finishButton = document.getElementById("finishButton");

const timetable = document.getElementById("timetable");
const userList = document.getElementById("userList");

const timetableTab = document.getElementById("timetableTab");
const meetingTab = document.getElementById("meetingTab");
const timetableView = document.getElementById("timetableView");
const meetingView = document.getElementById("meetingView");
const meetingTimetable = document.getElementById("meetingTimetable");


const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const hours = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00"
];


let editMode = false;
let currentUser = null;

let isDragging = false;
let dragMode = true;

const selectedUsers = new Set();


function addCellEvents(cell) {

    cell.addEventListener("mousedown", function() {

        if (!editMode) {
            return;
        }

        isDragging = true;

        dragMode = !cell.classList.contains("selected");

        cell.classList.toggle("selected", dragMode);
    });


    cell.addEventListener("mouseenter", function() {

        if (editMode && isDragging) {
            cell.classList.toggle("selected", dragMode);
        }

    });
}


function createTimetable() {

    const corner = document.createElement("div");
    corner.className = "header-cell";

    timetable.appendChild(corner);


    for (const day of days) {

        const header = document.createElement("div");

        header.className = "header-cell";
        header.textContent = day;

        timetable.appendChild(header);
    }


    for (const hour of hours) {

        const timeLabel = document.createElement("div");

        timeLabel.className = "time-label";
        timeLabel.textContent = hour;
        timeLabel.dataset.hour = hour;

        timetable.appendChild(timeLabel);


        for (const day of days) {

            const hourCell = document.createElement("div");

            hourCell.className = "hour-cell";
            hourCell.dataset.hour = hour;


            const firstHalf = document.createElement("button");

            firstHalf.dataset.cellId =
                `${day}-${hour}`;


            const secondHalf = document.createElement("button");

            secondHalf.dataset.cellId =
                `${day}-${hour.slice(0, 2)}:30`;


            addCellEvents(firstHalf);
            addCellEvents(secondHalf);


            hourCell.appendChild(firstHalf);
            hourCell.appendChild(secondHalf);

            timetable.appendChild(hourCell);
        }
    }
}


function setTimetableExtendedMode(isExtended) {

    const visibleHours = isExtended
        ? hours
        : [
            "09:00",
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00"
        ];

    const visibleSet = new Set(visibleHours);

    const rows = timetable.querySelectorAll(
        ".time-label, .hour-cell"
    );

    for (const row of rows) {
        row.classList.toggle(
            "hidden-hour",
            !visibleSet.has(row.dataset.hour)
        );
    }

    // 평소에는 기존 09:00~18:00 비율,
    // 수정 중에는 08:00~22:00 전체를 같은 화면 높이에 맞춰 압축
    timetable.classList.toggle("edit-extended", isExtended);
}


function clearTimetable() {

    const cells = timetable.querySelectorAll("button");

    for (const cell of cells) {
        cell.classList.remove(
            "selected",
            "overlap-1",
            "overlap-2",
            "overlap-3",
            "overlap-4"
        );

        cell.textContent = "";
    }
}


document.addEventListener("mouseup", function() {

    isDragging = false;

});


editControls.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = nameInput.value.trim();

    if (name === "") {
        return;
    }


    // 현재 화면 초기화
    clearTimetable();
    selectedUsers.clear();


    currentUser = name;
    editMode = true;

    // 입력할 때만 08:00~21:30 전체 범위 표시
    setTimetableExtendedMode(true);


    // Firestore에서 같은 이름의 시간표 확인
    const scheduleSnap = await getDoc(
        doc(db, "schedules", name)
    );


    // 기존 데이터가 있으면 시간표에 표시
    if (scheduleSnap.exists()) {

        const times =
            scheduleSnap.data().times ?? [];


        for (const time of times) {

            const cell =
                timetable.querySelector(
                    `button[data-cell-id="${time}"]`
                );

            if (cell) {
                cell.classList.add("selected");
            }
        }
    }


    await loadUserList();
});


finishButton.addEventListener("click", async function() {

    if (!editMode || currentUser === null) {
        return;
    }


    const selectedTimes = Array.from(

        timetable.querySelectorAll("button.selected"),

        function(cell) {
            return cell.dataset.cellId;
        }

    );


    await setDoc(
        doc(db, "schedules", currentUser),
        {
            times: selectedTimes
        }
    );


    editMode = false;
    currentUser = null;

    // 평소 시간표는 09:00~17:30만 표시
    setTimetableExtendedMode(false);

    nameInput.value = "";


    clearTimetable();

    await loadUserList();

    if (meetingView.classList.contains("active")) {
        await drawMeetingAvailability();
    }
});


async function drawSelectedSchedules() {

    editMode = false;
    currentUser = null;

    setTimetableExtendedMode(false);
    clearTimetable();


    const counts = {};
    const namesByTime = {};


    for (const name of selectedUsers) {

        const scheduleSnap = await getDoc(
            doc(db, "schedules", name)
        );


        if (!scheduleSnap.exists()) {
            continue;
        }


        const times =
            scheduleSnap.data().times ?? [];


        for (const time of times) {

            if (counts[time]) {
                counts[time]++;
            } else {
                counts[time] = 1;
            }

            if (namesByTime[time]) {
                namesByTime[time].push(name);
            } else {
                namesByTime[time] = [name];
            }
        }
    }


    const cells =
        timetable.querySelectorAll("button");


    for (const cell of cells) {

        const time = cell.dataset.cellId;

        const count =
            counts[time] ?? 0;


        if (count > 0) {

            const level = Math.min(count, 4);

            cell.classList.add(
                `overlap-${level}`
            );


            const names = namesByTime[time];
            const lines = [];


            // 한 줄에 최대 3명씩 표시
            for (let i = 0; i < names.length; i += 3) {

                lines.push(
                    names.slice(i, i + 3).join(" ")
                );
            }


            cell.textContent =
                lines.join("\n");
        }
    }
}


function createMeetingTimetable() {

    meetingTimetable.innerHTML = "";

    const corner = document.createElement("div");
    corner.className = "meeting-header-cell";
    meetingTimetable.appendChild(corner);

    for (const day of days) {
        const header = document.createElement("div");
        header.className = "meeting-header-cell";
        header.textContent = day;
        meetingTimetable.appendChild(header);
    }

    for (const hour of hours) {

        const timeLabel = document.createElement("div");
        timeLabel.className = "meeting-time-label";
        timeLabel.textContent = hour;
        meetingTimetable.appendChild(timeLabel);

        for (const day of days) {

            const hourCell = document.createElement("div");
            hourCell.className = "meeting-hour-cell";

            const firstHalf = document.createElement("div");
            firstHalf.className = "meeting-slot";
            firstHalf.dataset.cellId = `${day}-${hour}`;

            const secondHalf = document.createElement("div");
            secondHalf.className = "meeting-slot";
            secondHalf.dataset.cellId = `${day}-${hour.slice(0, 2)}:30`;

            hourCell.appendChild(firstHalf);
            hourCell.appendChild(secondHalf);
            meetingTimetable.appendChild(hourCell);
        }
    }
}


async function drawMeetingAvailability() {

    const querySnapshot = await getDocs(
        collection(db, "schedules")
    );

    const totalUsers = querySnapshot.size;
    const unavailableByTime = {};
    const unavailableNamesByTime = {};

    for (const userDoc of querySnapshot.docs) {

        const name = userDoc.id;
        const times = userDoc.data().times ?? [];

        for (const time of times) {

            unavailableByTime[time] =
                (unavailableByTime[time] ?? 0) + 1;

            if (unavailableNamesByTime[time]) {
                unavailableNamesByTime[time].push(name);
            } else {
                unavailableNamesByTime[time] = [name];
            }
        }
    }

    const slots =
        meetingTimetable.querySelectorAll(".meeting-slot");

    for (const slot of slots) {

        const time = slot.dataset.cellId;
        const unavailable = unavailableByTime[time] ?? 0;
        const available = Math.max(totalUsers - unavailable, 0);

        slot.className = "meeting-slot";

        if (totalUsers === 0) {
            slot.textContent = "-";
            slot.title = "저장된 시간표가 없습니다.";
            continue;
        }

        slot.textContent = `${available}/${totalUsers}`;

        const ratio = available / totalUsers;

        // 가능 비율을 0~10 단계로 표시
        // 0 = 모두 불가능, 10 = 모두 가능
        const level = Math.min(
            10,
            Math.max(0, Math.round(ratio * 10))
        );

        slot.classList.add(`availability-${level}`);

        const unavailableNames =
            unavailableNamesByTime[time] ?? [];

        slot.title = unavailableNames.length > 0
            ? `Unavailable: ${unavailableNames.join(", ")}`
            : "Everyone available";
    }
}


async function showTimetableTab() {

    timetableTab.classList.add("active");
    meetingTab.classList.remove("active");

    timetableView.classList.add("active");
    meetingView.classList.remove("active");
}


async function showMeetingTab() {

    timetableTab.classList.remove("active");
    meetingTab.classList.add("active");

    timetableView.classList.remove("active");
    meetingView.classList.add("active");

    await drawMeetingAvailability();
}


timetableTab.addEventListener("click", showTimetableTab);
meetingTab.addEventListener("click", showMeetingTab);


async function loadUserList() {

    userList.innerHTML = "";


    const querySnapshot =
        await getDocs(
            collection(db, "schedules")
        );


    for (const userDoc of querySnapshot.docs) {

        const name = userDoc.id;


        // 이름 + 삭제 버튼을 담는 한 줄
        const row =
            document.createElement("div");

        row.className = "user-row";


        // 이름 버튼
        const button =
            document.createElement("button");

        button.className = "user-name";


        button.textContent =
            selectedUsers.has(name)
                ? `✓ ${name}`
                : name;


        button.addEventListener(
            "click",
            async function() {

                if (selectedUsers.has(name)) {

                    selectedUsers.delete(name);

                } else {

                    selectedUsers.add(name);

                }


                button.textContent =
                    selectedUsers.has(name)
                        ? `✓ ${name}`
                        : name;


                await drawSelectedSchedules();
            }
        );


        // 삭제 버튼
        const deleteButton =
            document.createElement("button");

        deleteButton.className = "delete-user";
        deleteButton.textContent = "×";


        deleteButton.addEventListener(
            "click",
            async function() {

                const confirmed =
                    confirm(
                        `${name}의 시간표를 삭제하시겠습니까?`
                    );


                if (!confirmed) {
                    return;
                }


                await deleteDoc(
                    doc(db, "schedules", name)
                );


                selectedUsers.delete(name);

                await drawSelectedSchedules();
                await loadUserList();

                if (meetingView.classList.contains("active")) {
                    await drawMeetingAvailability();
                }
            }
        );


        row.appendChild(button);
        row.appendChild(deleteButton);

        userList.appendChild(row);
    }
}


createTimetable();
setTimetableExtendedMode(false);
createMeetingTimetable();

loadUserList();
