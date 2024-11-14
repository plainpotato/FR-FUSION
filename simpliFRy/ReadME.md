# SimpliFRy

![Project Logo](static/favicon.png)

---

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)

---

## Description

**SimpliFRy** is the core component of [Real-time FRS 2.0](https://github.com/CJBuzz/Real-time-FRS-2.0) and is the software that handles Real-time Facial Recognition. It is a locally-hosted web application built using python 3.10 and [Flask](https://github.com/pallets/flask), and makes use of the [insightface](https://github.com/deepinsight/insightface) library by deepinsight for face detection and generation of embeddings as well as the [voyager](https://github.com/spotify/voyager) library by Spotify for K-Nearest Neighbour search.

---

## Features

### Cutting out the need for 3rd Party Softwares.

Previous iterations of Fusion's Facial Recognition System reads the live video feed through _Video Capture Devices_. These include Webcams, USB Capture Devices and OBS Virtual Camera. However, most of the cameras used in conjunction with the FRS transmit their feed via _Real-Time Streaming Protocol_ (RTSP) through ethernet cables. To access the feed, 3rd party softwares such as OBS Studio and VLC Media Player are used to broadcast the RTSP stream in a Virtual Camera.

As OBS Studio only broadcasts one instance of virtual camera at a time, this limits the number of camera feed a computer, no matter how computationally powerful, can access to one. As a result, multiple computers have to be used whenever multiple cameras are used, which they often are (in a bid to cover more angles for facial recognition).

The use of **FFmpeg** in simpliFRy to read the the RTSP stream directly solves this issue by bypassing the need for OBS Studio. Now, a sufficiently powerful computer is able to simultaneously run facial recognition on at least 2 video feeds at once (subject to quality of ethernet cable), maximising the use of hardware resources.

Incidentally, removing the need for 3rd party softwares, not only simplifies the installation process (as you only need to install this software), but also reduces the complexity of operating the program, hence making it easier even for non-technologically inclined persons to learn and remember.

### Enhanced Detection Algorithm

_How do we increase the detection rate, while also minimising false positives?_

This was a key concern in previous iterations of the FRS. Set the similarity threshold too strict and most faces would be labelled as 'unknown' most of the time; set it too lenient and some faces might be wrongly labelled as another person. The former does not make a good showcase to an audience (who would be impressed by a facial recognition software that labels everyone as ) What a frustrating conundrum!

An astute observer might encourage programmers to 'adjust the FR model used' to better suit our cases. Unfortunately, novice programmers like myself with little understanding of the mathematics behind deep neural network do not fancy our chances of actually improving the model should we dive in head on.

Returning to the key question of this section, I added 2 small modifications to the algorithm. Hopefully, that addresses the concern to a reasonable degree of success. But before I dive into these 2 modifications, let us first take a look at how the FR algorithm works.

#### The Facial Recognition Algorithm

The FR Algorithm works as follows:

1. A database of face pictures is analysed by the insightface model, their embeddings produced and loaded into the voyager vector index
2. An query image is passed to the insightface model, which detects the image for human faces and represents them as an <ins>embedding</ins> (a list of numbers). Let us call these faces 'query faces' and their respective embeddings 'query embeddings'.
3. A K-Nearest Neighbour search is conducted on each of those query embeddings using voyager, a vector index that is loaded with the embedding representation of a database of faces.
4. The closest embedding is found, and its <ins>similarity score</ins> with the query embedding is retrieved (**the similarity metric used is cosine similarity, so the lower the number, the closer the match**).
5. If the similarity score is <ins>above</ins> a given threshold (cosine distance further than threshold), the face from which the query embedding is derived (query face) is considered an <ins>unknown face</ins>. If the score is <ins>below</ins> the threshold, the query face will be labelled as the <ins>person whose face produced the closest matching embedding</ins>.

#### Modification 1: Differentiator

The differentiator mechanic was conceived from 3 observations.

1. A sufficiently low (strict) threshold that eliminates almost all false positives will result in a less than ideal detection rate.
2. False detections (incorrectly labelling a person as someone else) generally occurs when the similarity score of the wrong face is marginally lower than the similarity score of the correct face, and this tends to occur only with lenient (high) score.
3. When the FR Algorithm fails to pick up someone whose face is in its database, there is a good chance that the face it should have picked up (correct individual) has a much lower similarity score (closer match) than the next closest face (someone else). This is especially true for smaller datasets of faces.

These provide 2 implications.

1. The first 2 observations imply that when the 2 closest embeddings have close similarity scores with each other, it is preferable to have a _stricter_ threshold.
2. Observations 1 and 3 imply that when the closest embeddings is significantly more similar to the query embedding than the next closest embedding, it is preferable to have a _more lenient_ threshold.

The differentiator mechanic does exactly that. Instead of just fetching the closest embedding in step 4, it retrieves the 2 closest embeddings and their similarity scores. It then compares their similarity scores. If the <ins>difference in similarity scores</ins> of the 2 closest embedding is greater than a **_Similarity Gap_**, a **_Lenient Threshold_** will be used. If the difference is less than the similarity gap, the original, stricter threshold will be used.

In effect, this mechanic allows the FR algorithm to detect faces it otherwise fails to capture if a clear favourite stands out.

#### Modification 2: Persistor

The persistor mechanic came about from this one observation.

1. If an individual gets detected correctly while facing one angle, a small movement (commonly a slight rotation of his/her head) may result in a bad angle and thus having his face re-labelled as 'unknown'. This is in spite of the individual remaining at pretty much the same spot in the video.

As the insightface algorithm creates facial embeddings from facial features, angle of a face with respect to the camera is a significant factor. Some angles that hide certain features could alter the embeddings to a large enough degree that their similarity scores with the database embedding no longer meet a certain threshold.

The persistor mechanic comes into play by making use of the following:

1. The individual's face was previously detected by the FR algorithm
2. From one frame to the next, the embedding representation of an individual's face will not change significantly.
3. From one frame to the next, the position of an individual's face will not change significantly.

Therefore, the mechanic works as follows:

1. Upon successful detection of an individual, the his/her query embeddings are updated and maintained in a dictionary for up to the duration of the **_Holding Time_**.
2. If a query face fails to be detected, its embedding will be compared to those stored in the dictionary. To consider the face as 'detected', it must fulfil 3 conditions: the position of the query face and that of the face in the persistor dictionary must be in roughly the same position (**_IOU Threshold_**) **AND** the similarity, as measured using cosine distance, between query embedding and the embedding in the persistor dictionary (which are previous query embeddings) must below **_Persistor Threshold_** (which is very strict) **AND** the query embedding's similarity score with corresponding embedding in the database must meet a separate **_Lenient Threshold_** (different from the Lenient Threshold of the differentiator).
3. Should the query face be detected as a result of the persistor mechanic, its query embedding will be updated in the dictionary and replace the previous query embedding.

Notes

- The position checker in this mechanic currently uses Intersection-Over-Union (IOU). This might not be the best way to do so and a more conventional tracking algorithm such as DeepSORT could be used instead.
- The persistor mechanic might not be very useful or reliable, you can turn it off in the [settings page](#settings).

### Microservices Design

While fully operational as an independent software, simpliFRy can also be used as a microservice as part of a larger software. The UI for simpliFRy is lightweight, built using <ins>HTML/CSS/JS</ins> and contains only the most essential features.

Instead, here are a list of API endpoints that frontend services and other backend services can use to interact with the simpliFRy app.

| Endpoint      | Method | Description                              |
| ------------- | :----: | ---------------------------------------- |
| `/start`      |  POST  | Start video broadcast and FR inferencing |
| `/checkAlive` |  GET   | Check if FR has started                  |
| `/vidFeed`    |  GET   | Access video feed of camera              |
| `/frResults`  |  GET   | Access FR Results                        |
| `/submit`     |  POST  | Change FR [settings](#settings)          |

#### 1. Start FR

- **Endpoint**: `/start`
- **Method**: `POST`
- **Description**: Start video broadcast and FR inferencing
- **Request**: Form Data
  - `stream_src` (string, required): RTSP URL of stream source (e.g. `rtsp://[username:password@]ip_address[:rtsp_port]/server_URL[[?param1=val1[?param2=val2]…[?paramN=valN]]`)
  - `data_file` (string, optional): Path to JSON file mapping name of individual to images of their faces; path is relative to the `data` [directory](#data-folder), which is volume mounted to the docker container.
- **Response**:
  - Status: `200 OK`
  - Body when stream has not started:
    ```json
    {
      "stream": true,
      "message": "Success!",
    }
    ```
  - Body when stream already started:
    ```json
    {
      "stream": false,
      "message": "Stream already started!",
    }
    ```

#### 2. Check if FR has started

- **Endpoint**: `/checkAlive`
- **Method**: `GET`
- **Description**: Check if FR has started.
- **Request**: No parameters required
- **Response**:
  - Status: `200 OK`
  - Body if started (string): "Yes"
  - Body if not started (string): "No"  

#### 3. Access Video Feed

- **Endpoint**: `/vidFeed`
- **Method**: `GET`
- **Description**: Access video feed of Camera (transmitted via RTSP). This endpoint streams the video as a HTTP Streaming Response.
- **Request**: No parameters required
- **Response**:
  - Status: `200 OK`
  - Mimetype: `multipart/x-mixed-replace; boundary=frame`

To access the video stream, create an `<object>` element in HTML, set its `type` attribute to `image/jpeg` and `data` attribute to `/vidFeed`.
```html
<object type='image/jpeg' data='/vidFeed'></object>
``` 

#### 4. Access FR Results

- **Endpoint**: `/frResults`
- **Method**: `GET`
- **Description**: Access FR Results. This endpoint streams the names of the recently detected individuals in a HTTP Streaming Response. (Refer to [settings](#settings) for the exact duration of 'recently`.)
- **Request**: No parameters required.
- **Response**:
  - Status: `200 OK`
  - Mimetype: `application/json`
  - Body:
    ```json
    {
      "data": [
        { // For individuals whose faces are currently on the video feed
            "bbox": [0.2, 0.1, 0.4, 0.3], // Bounding box in x1, y1, x2, y2 format (left top right bottom)
            "label": "John Doe", // Individual's name
            "score": 0.60 // Similarity score
        },
        { // For individuals whose faces were recently on the video feed
            "label": "Jane Smith"
        }
      ]
    }
    ```

To parse the data, refer to `static/js/detections.js` in the `processStream` function for an example of how to handle the HTTP streaming response on javascript.

#### 5. Change FR Settings

- **Endpoint**: `/submit`
- **Method**: `POST`
- **Description**: Change FR settings (include parameters such as the various thresholds, more information [here](#settings))
- **Request**: Form Data (details of field can be found in the [settings](#settings) section)
  - `threshold` (float, optional)
  - `holding_time` (float, optional)
  - `use_differentiator` (bool, optional)
  - `similarity_gap` (float, optional)
  - `use_persistor` (bool, optional)
  - `threshold_prev` (float, optional)
  - `threshold_iou` (float, optional)
  - `threshold_lenient_pers` (float, optional)
- **Response**:
  - Status: `200 OK`
  - Redirects to `/settings` page 

Hopefully, this makes simpliFRy far more versatile as other simple highly-specialised apps can be created to interact with it depending on the requirements of the user. (It is also because it takes too much work to build an app with a lot of customisable features.)

---

## Installation

### Prerequisites

- Software or tools needed (e.g., Node.js, Python, Docker, etc.)

### Step-by-Step Guide

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repository-name.git
   ```

---

## Usage

### Data Preparation

#### Data Folder

### Software

### Settings
