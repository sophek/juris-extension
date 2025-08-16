const twindCss = document.createElement("script")
twindCss.src = chrome.runtime.getURL("twind.js")
twindCss.onload = function () {
  console.log("Twind CSS loaded successfully")
  // Initialize the app only after twind is loaded
  initializeApp()
}
twindCss.onerror = function () {
  console.error("Failed to load Twind CSS")
}
document.head.appendChild(twindCss)

const script = document.createElement("script")
script.src = chrome.runtime.getURL("inject.js")
script.onload = function () {
  this.remove()
}
;(document.head || document.documentElement).appendChild(script)

function initJuris() {
  const juris = new Juris({
    components: {
      Netflix,
      SkipVideoIconOff,
      SkipVideoIconOn
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
// UI Components
const SkipVideoIconOff = (props, context) => {
  // I want to create an svg icon that looks like this:
  // <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
  return {
    render: () => ({
      button: {
        className: "bg-transparent",
        onclick: () => props.onclick(),
        style: {
          height: "32px",
          width: "32px"
        },
        children: [
          {
            svg: {
              width: "32",
              height: "32",
              viewBox: "0 0 32 32",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              children: [
                {
                  path: {
                    d: "M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"
                  }
                },
                {
                  path: {
                    d: "M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"
                  }
                },
                {
                  path: {
                    d: "m2 2 20 20"
                  }
                }
              ]
            }
          }
        ]
      }
    })
  }
}

const SkipVideoIconOn = (props, context) => {
  console.log("SkipVideoIconOn", props)

  // I want to create an svg icon that looks like this:
  // <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
  return {
    render: () => ({
      button: {
        className: "bg-transparent",
        onclick: () => props.onclick(),
        style: {
          height: "32px",
          width: "32px"
        },
        children: [
          {
            svg: {
              width: "32",
              height: "32",
              viewBox: "0 0 32 32",
              fill: "none",
              stroke: "currentColor",
              children: [
                {
                  path: {
                    d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"
                  }
                },
                {
                  rect: {
                    x: "2",
                    y: "6",
                    width: "14",
                    height: "12",
                    rx: "2"
                  }
                }
              ]
            }
          }
        ]
      }
    })
  }
}

// Netflix Component

const Netflix = (props, context) => {
  const { getState, setState } = context

  // const scenes = [
  //   {
  //     name: "Scene 1",
  //     start: 100,
  //     end: 110,
  //     type: "skip"
  //   },
  //   {
  //     name: "Scene 2",
  //     start: 115,
  //     end: 120,
  //     type: "skip"
  //   },
  //   {
  //     name: "Scene 3",
  //     start: 122,
  //     end: 130,
  //     type: "blur"
  //   },
  //   {
  //     name: "Scene 4",
  //     start: 135,
  //     end: 140,
  //     type: "mute"
  //   }
  // ]

  const scenes = []

  let pendingSceneStart = null

  function analyzeVideoAt(timeMs) {
    // Convert to whole second like the provided example
    const timeSeconds = Math.round(Math.floor(timeMs / 1000))

    // Process only once per second to mirror timeupdate behavior
    if (getState("lastHandledSecond") === timeSeconds) return
    setState("lastHandledSecond", timeSeconds)

    // Only act when time equals the start of a skip range
    const matching = scenes.find((scene) => scene.start === timeSeconds)
    const endMatching = scenes.find((scene) => scene.end === timeSeconds)

    if (matching && matching.type === "skip") {
      console.log("skipping", matching.end)
      // Jump to the end of the section, like the reference code
      skipScene(matching.end)
    }
    // Blur the scene
    if (matching && matching.type === "blur") {
      console.log("blurring", matching.end)
      // This function should only be called once, so we need to check if the blur is already applied
      const video = document.querySelector("video")
      if (video.style.filter === "blur(5rem)") {
        return
      } else {
        blurScene(matching.end - matching.start)
      }
    }

    // Mute the scene
    if (matching && matching.type === "mute") {
      console.log("muting", matching.end)
      // This function should only be called once, so we need to check if the mute is already applied
      muteScene()
    }

    if (endMatching && endMatching.type === "mute") {
      console.log("unmuting", endMatching.end)
      unmuteScene()
    }
  }

  function skipScene(seconds) {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "seek", data: { time: seconds * 1000 } } // Seek to 1 minute
      })
    )
  }

  function muteScene() {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "mute" }
      })
    )
  }

  function unmuteScene() {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "unmute" }
      })
    )
  }

  function blurScene(seconds) {
    // Get the video element
    const video = document.querySelector("video")
    // Set the blur effect
    video.style.cssText += "filter: blur(5rem)"
    // After 1 second, remove the blur effect
    setTimeout(() => {
      video.style.filter = "blur(0rem)"
    }, seconds * 1000)
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

  function sceneCaptureByKeys(type = "skip") {
    const currentSeconds = Math.floor(Number(getState("playTime")) / 1000)
    if (pendingSceneStart === null) {
      pendingSceneStart = currentSeconds
      console.log("Scene start captured:", pendingSceneStart)
    } else {
      const start = Math.min(pendingSceneStart, currentSeconds)
      const end = Math.max(pendingSceneStart, currentSeconds)
      console.log("Scene end captured:", end)
      const newScene = {
        name: `Scene ${scenes.length + 1}`,
        start,
        end,
        type: type
      }
      scenes.push(newScene)
      console.log("New scene added:", newScene)
      console.log("scenes", scenes)
      pendingSceneStart = null
    }
  }

  function keyboardEventManager() {
    window.addEventListener("keydown", (e) => {
      console.log("keydown", e)
      // Only allow adding scenes when analyzing and playing
      if (getState("isAnalyzing") && getState("isPlaying") === "playing") {
        if (e.code === "KeyS") {
          sceneCaptureByKeys("skip")
        }
        if (e.code === "KeyB") {
          sceneCaptureByKeys("blur")
        }
        if (e.code === "KeyM") {
          sceneCaptureByKeys("mute")
        }
      }
    })
  }
  function removeKeyboardEventManager() {
    window.removeEventListener("keydown", keyboardEventManager)
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
    hooks: {
      onMount: () => {
        keyboardEventManager()
      },
      onUnmount: () => {
        removeKeyboardEventManager()
      }
    },
    render: () => ({
      div: {
        className: "netflix-app absolute top-[20px] right-[100px]",
        children: [
          {
            div: {
              className: "skip-video-icon",
              style: {
                position: "absolute"
              },
              children: () => {
                if (getState("isAnalyzing")) {
                  return {
                    SkipVideoIconOn: { onclick: () => toggleAnalyzeVideo() }
                  }
                } else {
                  return {
                    SkipVideoIconOff: { onclick: () => toggleAnalyzeVideo() }
                  }
                }
              }
            }
          }
        ]
      }
    })
  }
}

function initializeApp() {
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
}
