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
      isPlaying: "paused",
      isAnalyzing: false,
      analyzeInterval: null,
      resumeOnPlay: false,
      lastHandledSecond: null
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

  const scenes = [
    {
      name: "Scene 1",
      start: 100,
      end: 110
    },
    {
      name: "Scene 2",
      start: 115,
      end: 120
    },
    {
      name: "Scene 3",
      start: 122,
      end: 130
    },
    {
      name: "Scene 4",
      start: 135,
      end: 140
    }
  ]

  
  function analyzeVideoAt(timeMs) {
    // Convert to whole second like the provided example
    const timeSeconds = Math.round(Math.floor(timeMs / 1000))

    // Process only once per second to mirror timeupdate behavior
    if (getState("lastHandledSecond") === timeSeconds) return
    setState("lastHandledSecond", timeSeconds)

    // Only act when time equals the start of a skip range
    const matching = scenes.find((scene) => scene.start === timeSeconds)
    if (matching) {
      console.log("skipping", matching.end)
      // Jump to the end of the section, like the reference code
      skipScene(matching.end)
    }
  }

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
  function toggleAnalyzeVideo() {
    const currentlyAnalyzing = getState("isAnalyzing")
    if (currentlyAnalyzing) {
      clearInterval(getState("analyzeInterval"))
      setState("analyzeInterval", null)
      setState("isAnalyzing", false)
      setState("resumeOnPlay", false)
    } else {
      setState("isAnalyzing", true)
      setState("resumeOnPlay", false)
      // Start polling current time only while playing
      setState(
        "analyzeInterval",
        setInterval(() => {
          if (getState("isAnalyzing") && getState("isPlaying") === "playing") {
            window.dispatchEvent(
              new CustomEvent("NetflixCommand", {
                detail: { command: "getCurrentTime" }
              })
            )
          }
        }, 1000)
      )
      // Prime playing state immediately
      window.dispatchEvent(
        new CustomEvent("NetflixCommand", {
          detail: { command: "getPlaybackState" }
        })
      )
    }
  }

  window.addEventListener("NetflixResponse", (e) => {
    const { command, result } = e.detail
    switch (command) {
      case "getCurrentTime":
        if (getState("isAnalyzing") && getState("isPlaying") === "playing") {
          console.log(`⏰ Current video time: ${result}ms`)
          setState("playTime", result)
          analyzeVideoAt(result)
        }
        break
      case "getDuration":
        console.log(`⏱️ Video duration: ${result}ms`)
        break
      case "getPlaybackState":
        // Normalize to boolean for logic, but keep state as string for UI
        const isPlayingBool = result === true || result === "playing"
        console.log(`🎥 Video is ${isPlayingBool ? "playing" : "paused"}`)
        setState("isPlaying", isPlayingBool ? "playing" : "paused")

        // If paused while analyzing, stop analyzing and mark to resume on play
        if (!isPlayingBool && getState("isAnalyzing")) {
          clearInterval(getState("analyzeInterval"))
          setState("analyzeInterval", null)
          setState("isAnalyzing", false)
          setState("resumeOnPlay", true)
        }

        // If resumed from pause and we were analyzing before, restart analyzing
        if (isPlayingBool && getState("resumeOnPlay")) {
          setState("isAnalyzing", true)
          setState(
            "analyzeInterval",
            setInterval(() => {
              if (
                getState("isAnalyzing") &&
                getState("isPlaying") === "playing"
              ) {
                window.dispatchEvent(
                  new CustomEvent("NetflixCommand", {
                    detail: { command: "getCurrentTime" }
                  })
                )
              }
            }, 1000)
          )
          setState("resumeOnPlay", false)
        }
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
          },
          {
            button: {
              className: "btn btn-primary",
              text: () =>
                `Analyze Video ${getState("isAnalyzing") ? "On" : "Off"}`,
              onclick: () => toggleAnalyzeVideo()
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
