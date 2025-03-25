import subprocess
import threading
import time
from typing import Generator
import cv2
import numpy as np
from utils import log_info


class VideoPlayer:
    """
    Class for streaming video from ffmpeg or a camera
    """

    def __init__(self) -> None:
        """Initialises the class"""

        # For modifiables
        self.vid_lock = threading.Lock()

        # Thread event
        self.end_event = threading.Event()

        # Set resolution of input video
        self.width = 1280
        self.height = 720

        # Printing
        self.in_error = False

        # Check if ffmpeg has been initialised (used to block secondary requests)
        self.is_started = False

        log_info("Video Player initialised!")

    def _handle_stream_end(self) -> None:
        log_info("Ending stream.")
        self.is_started = False

    def _handleRTSP(self, stream_src: str) -> None:
        """
        Opens ffmpeg subprocess and processes the frame to bytes

        Arguments
        - stream_src: URL to RTSP video stream
        """
        command = [
            "ffmpeg",
            "-rtsp_transport", "tcp",  # Force TCP for RTSP
            "-i", stream_src.strip(),
            "-vsync", "0",
            "-copyts",
            "-an",
            "-sn",
            "-f", "rawvideo",
            "-s", f"{self.width}x{self.height}",
            "-pix_fmt", "bgr24",
            "-probesize", "32",
            "-analyzeduration", "0",
            "-fflags", "nobuffer",
            "-flags", "low_delay",
            "-tune", "zerolatency",
            "-b:v", "300k",
            "-buffer_size", "500k",
            "-r", "10",  # Reduced frame rate to 10 FPS
            "-",
        ]

        try:
            ffmpeg_process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        except Exception as e:
            log_info(f"An error occurred: {e}")
            self._handle_stream_end()

        while not self.end_event.is_set():
            raw_frame = ffmpeg_process.stdout.read(self.width * self.height * 3)

            if len(raw_frame) != (self.width * self.height * 3):
                self.end_event.set()
                continue

            frame = np.frombuffer(raw_frame, np.uint8).reshape((self.height, self.width, 3))
            _, buffer = cv2.imencode(".jpg", frame)

            with self.vid_lock:
                self.frame_bytes = buffer.tobytes()

        self._handle_stream_end()
        ffmpeg_process.terminate()
        ffmpeg_process.wait()

    def _handleCamera(self, camera_index: int) -> None:
        """
        Captures video from a camera (e.g., laptop webcam) and processes it to bytes
        
        Arguments
        - camera_index: the index of the camera (usually 0 for the laptop's built-in camera)
        """
        cap = cv2.VideoCapture(camera_index)
        
        if not cap.isOpened():
            log_info("Failed to open camera.")
            self._handle_stream_end()
            return

        while not self.end_event.is_set():
            ret, frame = cap.read()

            if not ret:
                self.end_event.set()
                continue

            _, buffer = cv2.imencode(".jpg", frame)

            with self.vid_lock:
                self.frame_bytes = buffer.tobytes()

        self._handle_stream_end()
        cap.release()

    def cleanup(self, sig, f) -> None:
        """Sets event to trigger termination of ffmpeg subprocess"""
        log_info("Cleaning up...")
        self.end_event.set()
        time.sleep(0.5)
        exit(0)

    def start_stream(self, stream_src: str) -> None:
        """
        Starts video stream in a separate thread
        
        Arguments
        - stream_src: URL to RTSP video stream or camera index (e.g., '0' for laptop webcam)
        """
        self.is_started = True
        self.end_event = threading.Event()

        # If the source is an RTSP link (starts with rtsp://), start an RTSP stream handler
        if stream_src.startswith("rtsp://"):
            self.streamThread = threading.Thread(target=self._handleRTSP, args=(stream_src,))
        else:
            # Otherwise, treat it as a camera index
            try:
                camera_index = int(stream_src)
                self.streamThread = threading.Thread(target=self._handleCamera, args=(camera_index,))
            except ValueError:
                log_info("Invalid input: Please provide a valid RTSP URL or camera index.")
                return

        self.streamThread.daemon = True
        self.streamThread.start()

    def end_stream(self) -> None:
        """Ends the video stream"""
        self.end_event.set()

    def start_broadcast(self) -> Generator[bytes, any, any]:
        """
        Broadcasts video stream
        
        Returns
        - Generator yielding video frames processed from the video source
        """
        while self.streamThread.is_alive():
            with self.vid_lock:
                frame_bytes = self.frame_bytes
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
