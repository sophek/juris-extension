const script = document.createElement("script")
script.src = chrome.runtime.getURL("inject.js")
script.onload = function () {
  this.remove()
}
;(document.head || document.documentElement).appendChild(script)

function initJuris() {
  const juris = new Juris({
    components: {
      Netflix
    },

    layout: {
      div: {
        children: [{ Netflix: {} }]
      }
    },

    states: {
      playTime: 0,
      isPlaying: "paused"
    }
  })
  return juris
}

function jurisApp() {
  const app = document.createElement("div")
  app.id = "juris-extension"
  document.body.appendChild(app)
}

const Netflix = (props, context) => {
  const { getState, setState } = context

  function skipScene(seconds) {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "seek", data: { time: seconds * 1000 } } // Seek to 1 minute
      })
    )
  }
  function playVideo() {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "togglePlayPause" }
      })
    )
  }

  window.addEventListener("NetflixResponse", (e) => {
    const { command, result } = e.detail
    switch (command) {
      case "getCurrentTime":
        console.log(`⏰ Current video time: ${result}ms`)
        setState("playTime", result)
        break
      case "getDuration":
        console.log(`⏱️ Video duration: ${result}ms`)
        break
      case "getPlaybackState":
        console.log(`🎥 Video is ${result ? "playing" : "paused"}`)
        setState("isPlaying", result)
        break
      case "play":
        console.log("🎥 Video is playing")
        break
    }
  })

  return {
    render: () => ({
      div: {
        className: "netflix-app",
        children: [
          {
            h1: {
              className: "netflix-title",
              text: "Netflix"
            }
          },
          {
            button: {
              className: "btn btn-primary",
              text: () => `Skip Scene`,
              onclick: () => skipScene(60)
            }
          },
          {
            button: {
              className: "btn btn-primary",
              text: () => `Playing: ${getState("isPlaying")}`,
              onclick: () => playVideo()
            }
          }
        ]
      }
    })
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jurisApp)
} else {
  // Netflix-specific functionality
  if (window.location.hostname.includes("netflix.com")) {
    const juris = initJuris()
    jurisApp()
    juris.render("#juris-extension")
  }
}
