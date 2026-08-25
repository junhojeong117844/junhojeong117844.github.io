const timetable = document.getElementById("timetable");

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
        timetable.appendChild(cell);
    }
}

