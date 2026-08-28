import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc
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

const timetable = document.getElementById("timetable");
let isDragging = false;
let dragMode = true;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const times = [
	"09:00", "09:30",
	"10:00", "10:30",
	"11:00", "11:30",
	"12:00", "12:30",
	"13:00", "13:30",
	"14:00", "14:30",
	"15:00", "15:30",
	"16:00", "16:30",
	"17:00", "17:30",
];

const corner = document.createElement("div");
timetable.appendChild(corner);

for (const day of days) {
	const cell = document.createElement("div");
	cell.textContent = day;
	timetable.appendChild(cell);
}
for (const time of times) {

	const timeLabel = document.createElement("div");
	timeLabel.textContent = time;
	timetable.appendChild(timeLabel);

	for (const day of days) {
		const cell = document.createElement("button");

		cell.addEventListener("mousedown", function() {
				isDragging = true;

				dragMode = !cell.classList.contains("selected");

				cell.classList.toggle("selected", dragMode);
				});

		cell.addEventListener("mouseenter", function() {
				if (isDragging) {
				cell.classList.toggle("selected", dragMode);
				}
				});

		timetable.appendChild(cell);
	}
}

document.addEventListener("mouseup", function() {
    isDragging = false;
});

