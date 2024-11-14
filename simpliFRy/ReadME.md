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

If you are a developer and would like to understand more about how simpliFRy works, refer to the [Developer Guide](Developer%20Guide.md)

---

## Features

### Cutting out the need for 3rd Party Softwares.

Previous iterations of Fusion's Facial Recognition System reads the live video feed through _Video Capture Devices_. These include Webcams, USB Capture Devices and OBS Virtual Camera. However, most of the cameras used in conjunction with the FRS transmit their feed via _Real-Time Streaming Protocol_ (RTSP) through ethernet cables. To access the feed, 3rd party softwares such as OBS Studio and VLC Media Player are used to broadcast the RTSP stream in a Virtual Camera.

As OBS Studio only broadcasts one instance of virtual camera at a time, this limits the number of camera feed a computer, no matter how computationally powerful, can access to one. As a result, multiple computers have to be used whenever multiple cameras are used, which they often are (in a bid to cover more angles for facial recognition).

The use of **FFmpeg** in simpliFRy to read the the RTSP stream directly solves this issue by bypassing the need for OBS Studio. Now, a sufficiently powerful computer is able to simultaneously run facial recognition on at least 2 video feeds at once (subject to quality of ethernet cable), maximising the use of hardware resources.

Incidentally, removing the need for 3rd party softwares, not only simplifies the installation process (as you only need to install this software), but also reduces the complexity of operating the program, hence making it easier even for non-technologically inclined persons to learn and remember.

### [Enhanced Detection Algorithm](Developer%20Guide.md#enhanced-detection-algorithm)

### [Microservice Design](Developer%20Guide.md#microservice-design)

---

## Installation

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Nvidia Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) (for GPU usage within docker container, which is very recommended; install via WSL)

### Installation via Docker

1. Clone the repository:

   ```bash
   git clone https://github.com/CJBuzz/Real-time-FRS-2.0.git
   ```

2. Navigate to simpliFRy directory

   ```bash
   cd simpliFRy
   ```

3. Build Docker Image
   ```bash
   docker compose build
   ```

### Installation by other means

It is highly recommended to install and run simpliFRy via Docker, else there is a need to install dependencies such as CUDA and cuDNN separately. It is quite troublesome to achieve version compatibility for CUDA, cuDNN, pyTorch and onnxruntime. However, if you insist on refusing to use Docker, below are the versions that worked for me.
- CUDA 11.8
- cuDNN 8.9.2.26
- pyTorch 2.1.2+cu118
- onnxruntime 1.18.1

In addition, if you are using windows, there is a need to install CMake and Microsoft Visual Studio C++ built tools separately.

Afterwards, you can create a virtual environment in the `simpliFRy` directory

```bash
py -m venv venv
```

Activate it

```bash
venv\Scripts\activate # on windows, use source venv/bin/activate for linux and macOS
```

Install the requirements with pip

```bash
pip install -r requirements.txt
```

---

## Usage

### Data Preparation

#### Data Folder

### Software

### Settings
