const setBBoxPos = (bboxEl, bbox, width, height) => {
  let ratiod_height = height, ratiod_width = width;
  if ((height / width) > (9 / 16)) {
    ratiod_height = width * 9 / 16;
  } else {
    ratiod_width = height * 16 / 9;
  }

  const left_offset = (width - ratiod_width) / 2;
  const top_offset = (height - ratiod_height) / 2;

  const org_left = bbox[0] * ratiod_width;
  const org_top = bbox[1] * ratiod_height;
  const org_width = (bbox[2] - bbox[0]) * ratiod_width;
  const org_height = (bbox[3] - bbox[1]) * ratiod_height;

  const width_truncate = Math.max(0, -org_left);
  const height_truncate = Math.max(0, -org_top);

  bboxEl.style.left = `${Math.max(left_offset, org_left + left_offset).toFixed(0) - 5}px`;
  bboxEl.style.top = `${Math.max(top_offset, org_top + top_offset).toFixed(0) - 5}px`;
  bboxEl.style.width = `${Math.min(org_width - width_truncate, ratiod_width - org_left).toFixed(0)}px`;
  bboxEl.style.height = `${Math.min(org_height - height_truncate, ratiod_height - org_top).toFixed(0)}px`;
};

let currData = [];
let streamCheck = false;
const detectionList = document.getElementById("detections-list");

const updateBoxAnimations = (detectedLabels) => {
  const activeTables = new Set();

  detectedLabels.forEach(label => {
    const match = label.match(/\(T\d+\)/);
    if (match) {
      const table = match[0].replace(/[()]/g, '');
      activeTables.add(table);
    }
  });

  const boxes = document.querySelectorAll("#seatings-container .box");
  boxes.forEach(box => {
    const label = box.innerText.trim();
    if (activeTables.has(label)) {
      box.classList.add("animate-pulse");
    } else {
      box.classList.remove("animate-pulse");
    }
  });
};

const endDetections = () => {
  streamCheck = false;
  currData = [];
  clearBBoxes();
};

const fetchDetections = () => {
  streamCheck = true;
  console.log("FETCHING...");
  let buffer = '';
  let data = [];

  fetch(`/frResults`).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const processStream = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          clearBBoxes();
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const parts = buffer.split('\n');

        try {
          if (parts.length > 1) {
            data = JSON.parse(parts[parts.length - 2])?.data;
          }
        } catch (err) {
          console.log(buffer);
          console.error('Error parsing JSON:', err);
        }

        buffer = parts[parts.length - 1];

        updateDetections(data);
        if (streamCheck) processStream();
      });
    };
    processStream();
  });
};

const createDetectionEl = (name) => {
  const detectionEl = document.createElement("p");
  detectionEl.innerHTML = name;
  detectionEl.classList.add("detectionEntry");
  detectionList.appendChild(detectionEl);
};

const clearBBoxes = () => {
  const videoContainer = document.getElementById("video-container");
  detectionList.innerHTML = "";
  const prevBBoxes = videoContainer.querySelectorAll(".bbox");
  prevBBoxes.forEach((element) => {
    element.remove();
  });
  return videoContainer;
};

const updateDetections = (data) => {
  currData = [];
  const videoContainer = clearBBoxes();
  const uniqueLabels = new Set();

  data
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
    .map((detection) => {
      const unknown = detection.label === "Unknown";

      if (!unknown && !uniqueLabels.has(detection.label)) {
        createDetectionEl(detection.label);
        uniqueLabels.add(detection.label);
      }

      if (!detection.bbox) return;

      const bboxEl = document.createElement("div");
      bboxEl.classList.add("bbox");
      if (!unknown) {
        bboxEl.classList.add("bbox-identified");
      }

      bboxEl.innerHTML = `<p class="bbox-label${unknown ? "" : " bbox-label-identified"}">${detection.label} <span class="bbox-score">${detection.score.toFixed(2)}</span></p>`;

      currData.push(detection.bbox);
      setBBoxPos(bboxEl, detection.bbox, videoContainer.offsetWidth, videoContainer.offsetHeight);
      videoContainer.appendChild(bboxEl);
    });

  updateBoxAnimations(Array.from(uniqueLabels));
};

window.addEventListener("resize", () => {
  const videoContainer = document.getElementById("video-container");
  const bboxesEl = videoContainer.querySelectorAll(".bbox");
  bboxesEl.forEach((element, idx) => {
    setBBoxPos(element, currData[idx], videoContainer.offsetWidth, videoContainer.offsetHeight);
  });
});

// TABLE MANAGEMENT
let boxCount = 0;

const loadTablesFromStorage = () => {
  const savedTables = JSON.parse(localStorage.getItem("tables") || "[]");
  boxCount = savedTables.length;
  savedTables.forEach(({ id, x, y, label, color, width, height }) => {
    const newBox = document.createElement("div");
    newBox.className = `box ${id}`;
    newBox.innerText = label;
    newBox.style.left = `${x}px`;
    newBox.style.top = `${y}px`;
    newBox.style.backgroundColor = color;
    newBox.style.width = `${width}px`;
    newBox.style.height = `${height}px`;
    document.getElementById("seatings-container").appendChild(newBox);
    makeDraggable(newBox);
  });
};

const saveTablesToStorage = () => {
  const boxes = document.querySelectorAll("#seatings-container .box");
  const tableData = Array.from(boxes).map((box) => {
    return {
      id: box.classList[1],
      label: box.innerText,
      x: box.offsetLeft,
      y: box.offsetTop,
      color: box.style.backgroundColor,
      width: box.offsetWidth,
      height: box.offsetHeight,
    };
  });
  localStorage.setItem("tables", JSON.stringify(tableData));
};

const randomColor = () => {
  const colors = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0"];
  return colors[Math.floor(Math.random() * colors.length)];
};

const makeDraggable = (box) => {
  box.style.position = "absolute";

  // Respect current lock state
  box.style.pointerEvents = document.getElementById("lock-tables").checked ? "none" : "auto";

  box.addEventListener("mousedown", (e) => {
    if (document.getElementById("lock-tables").checked) return; // Prevent drag if locked

    let offsetX = e.clientX - box.offsetLeft;
    let offsetY = e.clientY - box.offsetTop;
    box.style.zIndex = 1000;

    const onMouseMove = (e) => {
      box.style.left = `${e.clientX - offsetX}px`;
      box.style.top = `${e.clientY - offsetY}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      saveTablesToStorage();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
};


// KEYBOARD SHORTCUT FOR OPENING MENU
document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.altKey && e.code === "Digit0") {
    const menu = document.getElementById("table-menu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  }
});

// Event listener for toggling the lock/unlock functionality
document.getElementById("lock-tables").addEventListener("change", () => {
  const boxes = document.querySelectorAll("#seatings-container .box");
  const locked = document.getElementById("lock-tables").checked;

  boxes.forEach((box) => {
    box.style.pointerEvents = locked ? "none" : "auto";
  });
});


document.getElementById("close-menu").addEventListener("click", () => {
  document.getElementById("table-menu").style.display = "none";
});

document.getElementById("add-table").addEventListener("click", () => {
  boxCount += 1;
  const newBox = document.createElement("div");
  newBox.className = `box box${boxCount}`;
  newBox.innerText = `T${boxCount}`;
  newBox.style.backgroundColor = randomColor();
  document.getElementById("seatings-container").appendChild(newBox);
  makeDraggable(newBox);
  saveTablesToStorage();
});

document.getElementById("remove-table").addEventListener("click", () => {
  if (boxCount > 0) {
    const lastBox = document.querySelector(`.box${boxCount}`);
    if (lastBox) lastBox.remove();
    boxCount -= 1;
    saveTablesToStorage();
  }
});

document.getElementById("reset-tables")?.addEventListener("click", () => {
  document.querySelectorAll("#seatings-container .box").forEach(el => el.remove());
  boxCount = 0;
  saveTablesToStorage();
});

document.addEventListener("DOMContentLoaded", () => {
  loadTablesFromStorage();
});

// Video container toggle button

const videoContainer = document.getElementById("video-container");
const toggleVideoCheckbox = document.getElementById("toggle-video");

// Load saved visibility state
const isVideoVisible = localStorage.getItem("videoVisible") === "true";
toggleVideoCheckbox.checked = isVideoVisible;
videoContainer.classList.toggle("hidden", !isVideoVisible);

toggleVideoCheckbox.addEventListener("change", () => {
  const showVideo = toggleVideoCheckbox.checked;
  videoContainer.classList.toggle("hidden", !showVideo);
  localStorage.setItem("videoVisible", showVideo);
});

// Makes Menu Table Draggable

// Makes Menu Table Draggable

function makeMenuDraggable(menuId, handleId) {
  const menu = document.getElementById(menuId);
  const handle = document.getElementById(handleId);

  let offsetX = 0, offsetY = 0, isDragging = false;

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - menu.offsetLeft;
    offsetY = e.clientY - menu.offsetTop;
    document.addEventListener("mousemove", moveMenu);
    document.addEventListener("mouseup", stopDragging);
  });

  function moveMenu(e) {
    if (!isDragging) return;
    menu.style.left = `${e.clientX - offsetX}px`;
    menu.style.top = `${e.clientY - offsetY}px`;
  }

  function stopDragging() {
    isDragging = false;
    document.removeEventListener("mousemove", moveMenu);
    document.removeEventListener("mouseup", stopDragging);
  }
}

// Initialize the drag after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  loadTablesFromStorage();
  makeMenuDraggable("table-menu", "table-menu-header"); // ← renamed here
});

//new code
// === RIGHT-CLICK COLOR PICKER FOR BOXES ===
const colorPicker = document.getElementById("box-color-picker");

// Convert RGB (from computed style) to HEX for input color value
function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g).map(Number);
  return (
    "#" +
    result
      .slice(0, 3)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Show color picker on right-click of a table box
document.getElementById("seatings-container").addEventListener("contextmenu", (e) => {
  const targetBox = e.target.closest(".box");
  if (!targetBox) return;

  e.preventDefault(); // Prevent default context menu

  // Position color picker near the cursor
  colorPicker.style.left = `${e.pageX}px`;
  colorPicker.style.top = `${e.pageY}px`;
  colorPicker.style.display = "block";

  // Set current box color as the color picker's value
  const currentColor = rgbToHex(getComputedStyle(targetBox).backgroundColor);
  colorPicker.value = currentColor;

  // When user picks a new color
  const applyColor = (event) => {
    targetBox.style.backgroundColor = event.target.value;
    saveTablesToStorage();
    colorPicker.style.display = "none";
    colorPicker.removeEventListener("input", applyColor);
  };

  colorPicker.addEventListener("input", applyColor);
});

// Hide color picker when clicking outside
document.addEventListener("click", (e) => {
  if (e.target !== colorPicker) {
    colorPicker.style.display = "none";
  }
});

