const setBBoxPos = (bboxEl, bbox, width, height) => {
  let ratiod_height = height, ratiod_width = width;
  if ((height / width) > (9 / 16)) {
    ratiod_height = width * 9 / 16;
  } else {
    ratiod_width = height * 16 / 9;
  }

  const left_offset = (width - ratiod_width) / 2;
  const top_offset = (height - ratiod_height) / 2;

  const org_left = (bbox[0] * ratiod_width);
  const org_top = (bbox[1] * ratiod_height);
  const org_width = ((bbox[2] - bbox[0]) * ratiod_width);
  const org_height = ((bbox[3] - bbox[1]) * ratiod_height);

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
const detectionsMap = new Map();
let detectionHoldTime = 15000;

fetch('/settings.json')
  .then(response => response.json())
  .then(settings => {
    if (settings.detectionHoldTime) {
      detectionHoldTime = settings.detectionHoldTime * 1000;
    }
  })
  .catch(err => console.error('Failed to load settings:', err));

const endDetections = () => {
  streamCheck = false;
  currData = [];
  detectionsMap.clear();
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
        return;
      });
    };
    processStream();
  });
};

const updateDetectionListUI = () => {
  detectionList.innerHTML = '';
  [...detectionsMap.entries()]
    .sort((a, b) => b[1].addedTime - a[1].addedTime)
    .forEach(([name]) => {
      const detectionEl = document.createElement("p");
      detectionEl.innerHTML = name;
      detectionEl.classList.add("detectionEntry");
      detectionList.appendChild(detectionEl);
    });
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
  const currentTime = new Date().getTime();
  const detectedLabels = new Set();

  data.forEach((detection) => {
    if (detection.label !== "Unknown") {
      detectedLabels.add(detection.label);
      let record = detectionsMap.get(detection.label);

      if (!record) {
        record = { lastSeen: currentTime, addedTime: currentTime, expireStartTime: null };
        detectionsMap.set(detection.label, record);
      } else {
        record.lastSeen = currentTime;
        record.expireStartTime = null;
      }
    }

    if (!detection.bbox) return;

    const bboxEl = document.createElement("div");
    bboxEl.classList.add("bbox");
    if (detection.label !== "Unknown") {
      bboxEl.classList.add("bbox-identified");
    }

    bboxEl.innerHTML = `<p class="bbox-label${detection.label !== "Unknown" ? " bbox-label-identified" : ""}">${detection.label} <span class="bbox-score">${detection.score.toFixed(2)}</span></p>`;

    currData.push(detection.bbox);
    setBBoxPos(
      bboxEl,
      detection.bbox,
      videoContainer.offsetWidth,
      videoContainer.offsetHeight
    );
    videoContainer.appendChild(bboxEl);
  });

  detectionsMap.forEach((record, label) => {
    if (!detectedLabels.has(label)) {
      if (!record.expireStartTime) {
        record.expireStartTime = currentTime;
      } else if (currentTime - record.expireStartTime >= detectionHoldTime) {
        detectionsMap.delete(label);
      }
    } else {
      if (record.expireStartTime) {
        record.addedTime = currentTime; // Move to top only after disappearance and re-detection
      }
      record.expireStartTime = null;
    }
  });

  updateDetectionListUI();
};

window.addEventListener("resize", () => {
  const videoContainer = document.getElementById("video-container");
  const bboxesEl = videoContainer.querySelectorAll(".bbox");
  bboxesEl.forEach((element, idx) => {
    setBBoxPos(
      element,
      currData[idx],
      videoContainer.offsetWidth,
      videoContainer.offsetHeight
    );
  });
});
