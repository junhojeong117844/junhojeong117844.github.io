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


const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const hours = [
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

        timetable.appendChild(timeLabel);


        for (const day of days) {

            const hourCell = document.createElement("div");

            hourCell.className = "hour-cell";


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

    nameInput.value = "";


    clearTimetable();

    await loadUserList();
});


async function drawSelectedSchedules() {

    editMode = false;
    currentUser = null;

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
            }
        );


        row.appendChild(button);
        row.appendChild(deleteButton);

        userList.appendChild(row);
    }
}


createTimetable();

loadUserList();
