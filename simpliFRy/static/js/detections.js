const setBBoxPos = (bboxEl, bbox, width, height) => {
  // Setting bounding box position
  
  // Calculate video feed's width and height according to aspect ratio
  let ratiod_height = height, ratiod_width = width
  if ((height/width) > (9/16)) {
    ratiod_height = width * 9/16
  } else {
    ratiod_width = height * 16/9
  }

  // Calculate position offset
  const left_offset = (width - ratiod_width)/2
  const top_offset = (height - ratiod_height)/2

  // Calculate positioning of bounding box based on video feed's width and height
  const org_left = (bbox[0] * ratiod_width) 
  const org_top = (bbox[1] * ratiod_height) 
  const org_width = ((bbox[2] - bbox[0]) * ratiod_width)
  const org_height = ((bbox[3] - bbox[1]) * ratiod_height)

  // Calculate bounding box truncation of cases where bounding box is at edges
  const width_truncate = Math.max(0, -org_left)
  const height_truncate = Math.max(0, -org_top)

  // Set bounding box position
  bboxEl.style.left = `${Math.max(left_offset, org_left + left_offset).toFixed(0)}px`;
  bboxEl.style.top = `${Math.max(top_offset, org_top + top_offset).toFixed(0)}px`;
  bboxEl.style.width = `${Math.min(org_width - width_truncate, ratiod_width - org_left).toFixed(0)}px`;
  bboxEl.style.height = `${Math.min(org_height - height_truncate, ratiod_height - org_top).toFixed(0)}px`;
};


let currData = []; // Current detection data

const detectionList = document.getElementById("detections-list"); // Detection list parent element

const fetchDetections = () => {
  // Fetch FR detection results

  console.log("FETCHING...")
  let buffer = ''
  let data = []

  fetch(`/frResults`).then(response => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    const processStream = () => {
      // Recursive function to continuously process latest detection result (HTTP streaming response)

      reader.read().then(({ done, value }) => {
        if (done) {
          clearBBoxes();
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const parts = buffer.split('\n')

        try {
          if (parts.length > 1) {
            data = JSON.parse(parts[parts.length - 2])?.data
          }
        } catch (err) {
          console.log(buffer)
          console.error('Error parsing JSON:', err)
        }

        buffer = parts[parts.length - 1]

        updateDetections(data)
        processStream()
        return;
      }
      )
    }
    processStream()
  })
}

const createDetectionEl = (name) => {
  // Create detection entry in the detection list parent element

  const detectionEl = document.createElement("p");
  detectionEl.innerHTML = name;
  detectionEl.classList.add("detectionEntry");
  detectionList.appendChild(detectionEl);
}

const clearBBoxes = () => {
  // Delete all bounding boxes in the video container parent element

  const videoContainer = document.getElementById("video-container");
  detectionList.innerHTML = "";
  const prevBBoxes = videoContainer.querySelectorAll(".bbox");
  prevBBoxes.forEach((element) => {
    element.remove();
  });

  return videoContainer
}

const updateDetections = (data) => {
  // Update detection list and bounding boxes

  currData = [];

  // Remove previous bounding boxes
  const videoContainer = clearBBoxes()
  const uniqueLabels = new Set()

  // Add detection entries and bounding boxes to detection list and video container respectively
  data
    .sort((a, b) => {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    })
    .map((detection) => {
      const unknown = detection.label === "Unknown";

      if (!unknown && !uniqueLabels.has(detection.label)) {
        createDetectionEl(detection.label)
        uniqueLabels.add(detection.label)
      }

      if (!detection.bbox) return;

      const bboxEl = document.createElement("div");

      bboxEl.classList.add("bbox");
      if (!unknown) {
        bboxEl.classList.add("bbox-identified");
      }

      bboxEl.innerHTML = `<p class="bbox-label${unknown ? "" : " bbox-label-identified"
        }">${detection.label
        } <span class="bbox-score">${detection.score.toFixed(2)}</span></p>`;

      currData.push(detection.bbox);
      setBBoxPos(
        bboxEl,
        detection.bbox,
        videoContainer.offsetWidth,
        videoContainer.offsetHeight
      );
      videoContainer.appendChild(bboxEl)
    });

}

window.addEventListener("resize", () => {
  //Resize bounding boxes when window resizes

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
