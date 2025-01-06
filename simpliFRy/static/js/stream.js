const delay = (time) => {
    return new Promise(resolve => setTimeout(resolve, time))
}

const startDisplay = (formEl) => {
    // Replaces form with video feed

    formEl.style.display = 'none'
    const videoFeed = document.getElementById("video-feed"), mainContainer = document.getElementById('main-container')
    mainContainer.style.display = 'flex'
    videoFeed.setAttribute('data', '/vidFeed')
    fetchDetections()
}

const createLoadingAnimation = (text, loaderEl) => {
    // Handles loading animation (for dots)

    let dotCount = 0
    const updateLoadingText = () => {
        dotCount = (dotCount % 3) + 1
        loaderEl.innerText = text + '.'.repeat(dotCount)
    }

    intervalId = setInterval(updateLoadingText, 500)
    return intervalId
}

const checkAlive = (no_stream_callback = () => {}) => {
    // Check if stream is started and immediately loads video feed if it has
    fetch('/checkAlive').then(response => response.text()).then(data => {
        if (data === "Yes") {
            const form = document.getElementById("init")
            startDisplay(form)
        } else no_stream_callback()
    }).catch(error => console.log(error))
}

document.getElementById("init").onsubmit = async (event) => {
    // Handles form submission (stream url and data file)

    event.preventDefault()

    const form = event.target
    const formData = new FormData(form)

    // Remove submit button and create loading indicator
    const submitButton = document.getElementById('submit-button')
    submitButton.remove()

    const loader = document.createElement('h4')
    loader.classList.add('loading-indicator')
    let intervalId = createLoadingAnimation("Loading embeddings", loader)

    form.appendChild(loader)

    // Remove loader and put back submit button
    const reset_button = (loading_intervalId) => {
        clearInterval(loading_intervalId)
        form.appendChild(submitButton)
        loader.remove()
    }

    // Starts stream
    fetch(`/start`, {
        method: 'POST', 
        body: formData
    }).then(response => response.json()).then(data => {
        clearInterval(intervalId)
        intervalId = createLoadingAnimation("Starting stream", loader)

        if (data.stream) delay(5000).then(() => {
            checkAlive(() => alert(`FFMPEG unable to stream from provided source!`))
            reset_button(intervalId)
        })
        else {
            alert(data.message)
            reset_button(intervalId)
        }
    }).catch(error => {
        console.log(error)
        reset_button(intervalId)
    })
}


const taskbarPlaceholder = document.querySelector(".taskbar-placeholder")
const taskbar = document.querySelector(".taskbar")

taskbarPlaceholder.addEventListener("mouseenter", () => {
    taskbar.classList.add("show")
})

taskbarPlaceholder.addEventListener("mouseleave", () => {
    taskbar.classList.remove("show")
})

document.getElementById("end_stream_button").addEventListener("click", async (event) => {
    // Handles form submission to end stream

    event.preventDefault()
    endDetections()
    document.getElementById("video-feed").removeAttribute('data')

    fetch('/end', {
        method: 'POST'
    }).then(response => response.json()).then(_data => {
        document.getElementById("main-container").style.display = 'none'
        document.getElementById("init").style.display = 'flex'
    }).catch(error => {
        console.log(error)
    })
})


document.getElementById("main-container").style.display = 'none'
checkAlive()
