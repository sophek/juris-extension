import { init, i, id } from "@instantdb/core"
import { Juris } from "juris"
import { HeadlessManager } from "juris/juris-headless.js"

// ID for app: Netflix-CleanMix
const APP_ID = "6933cbb0-2972-4c2c-a647-842541953fa6"

// const schema = i.schema({
//   entities: {
//     time_codes: i.entity({
//       name: i.string(),
//       start: i.number(),
//       end: i.number(),
//       type: i.string()
//     })
//   },
//   links: {
//     movies: {
//       forward: { on: "time_codes", has: "one", label: "movies" },
//       reverse: { on: "movies", has: "many", label: "time_codes" }
//     }
//   }
// })

// Initialize the database
// ---------
const db = init({ appId: APP_ID })

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
    features: { headless: HeadlessManager },
    headlessComponents: {
      UtilsManager: (props, context) => ({
        api: {
          getNetflixVideoId: (url) => {
            const regex = /\/watch\/(\d+)/
            const match = url.match(regex)
            return match ? match[1] : null
          }
        },
        hooks: {
          onRegister: () => console.log("UtilsManager ready")
        }
      })
    },
    logLevel: "debug",
    components: {
      Netflix,
      SkipVideoIconOff,
      SkipVideoIconOn,
      Timeline,
      TimeLineToolbar
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
      lastHandledSecond: null,
      scenes: [],
      totalDuration: 0,
      volume: 100
    }
  })
  return juris
}

function jurisApp() {
  const app = document.createElement("div")
  app.id = "juris-extension"
  document.body.appendChild(app)
}

// Headless Components

// UI Components

const TimeLineToolbar = (props, context) => {
  const { getState, setState } = context

  // Helper function to format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Helper function to create segments
  const createSegment = (type) => {
    const currentTime = getState("playTime") || 0
    const currentTimeSeconds = Math.floor(currentTime / 1000)

    // Create a new segment
    const newSegment = {
      id: Date.now(),
      type: type,
      start: currentTimeSeconds,
      end: currentTimeSeconds + 10, // 10 second default duration
      startTime: currentTimeSeconds,
      endTime: currentTimeSeconds + 10
    }

    // Add to existing scenes
    const currentScenes = getState("scenes") || []
    setState("scenes", [...currentScenes, newSegment])
  }

  return {
    render: () => ({
      div: {
        style: {
          minWidth: "80%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: "2rem"
        },
        className:
          "w-full flex justify-center mx-auto bg-editor-panel rounded-lg overflow-hidden shadow-2xl absolute",
        children: [
          {
            div: {
              className: "flex items-center justify-between p-4 gap-12",
              children: [
                // Main Controls
                {
                  div: {
                    className: "flex items-center space-x-2",
                    children: [
                      // Segment Controls
                      {
                        button: {
                          onclick: () => createSegment("skip"),
                          className:
                            "px-8 py-6 rounded-md bg-red-600 hover:bg-red-700 transition-colors text-white text-2xl font-medium",
                          text: "+ Skip ✂"
                        }
                      },
                      {
                        button: {
                          onclick: () => createSegment("blur"),
                          className:
                            "px-8 py-6 rounded-md bg-green-600 hover:bg-green-700 transition-colors text-white text-2xl font-medium",
                          text: "+ Blur 💧"
                        }
                      },
                      {
                        button: {
                          onclick: () => createSegment("mute"),
                          className:
                            "px-8 py-6 rounded-md bg-orange-500 hover:bg-blue-700 transition-colors text-white text-2xl font-medium",
                          text: "+ Mute 🔊"
                        }
                      }
                    ]
                  }
                },
                // Playback Controls
                {
                  div: {
                    className: "flex items-center space-x-3",
                    children: [
                      {
                        button: {
                          onclick: () => {
                            const currentTime = getState("playTime") || 0
                            const newTime = Math.max(0, currentTime - 1000)
                            setState("playTime", newTime)
                          },
                          className:
                            "p-2 rounded-md hover:bg-editor-hover transition-colors",
                          children: [
                            {
                              div: {
                                className: "w-15 h-15 text-6xl",
                                text: "⏮" // SkipBack icon placeholder
                              }
                            }
                          ]
                        }
                      },
                      {
                        button: {
                          onclick: () => {
                            const isPlaying = getState("isPlaying")
                            setState(
                              "isPlaying",
                              isPlaying === "playing" ? "paused" : "playing"
                            )
                          },
                          className:
                            "p-3 rounded-full bg-editor-track bg-red-500 hover:bg-opacity-80 transition-colors",
                          children: [
                            {
                              div: {
                                className: "w-15 h-15 text-6xl",
                                text: () => {
                                  const isPlaying = getState("isPlaying")
                                  return isPlaying === "playing" ? "⏸" : "▶" // Pause/Play icon placeholder
                                }
                              }
                            }
                          ]
                        }
                      },
                      {
                        button: {
                          onclick: () => {
                            const currentTime = getState("playTime") || 0
                            const totalDuration = getState("totalDuration") || 0
                            const newTime = Math.min(
                              totalDuration,
                              currentTime + 1000
                            )
                            setState("playTime", newTime)
                          },
                          className:
                            "p-2 rounded-md hover:bg-editor-hover transition-colors",
                          children: [
                            {
                              div: {
                                className: "w-15 h-15 text-6xl",
                                text: "⏭" // SkipForward icon placeholder
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                // Time Display and Volume Control
                {
                  div: {
                    className: "flex items-center space-x-4",
                    children: [
                      {
                        div: {
                          className: "text-editor-text font-mono text-6xl",
                          text: () => {
                            const currentTime = getState("playTime") || 0
                            const totalDuration = getState("totalDuration") || 0
                            return `${formatTime(
                              Math.floor(currentTime / 1000)
                            )} / ${formatTime(
                              Math.floor(totalDuration / 1000)
                            )}`
                          }
                        }
                      }
                    ]
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

const SkipVideoIconOff = (props, context) => {
  // I want to create an svg icon that looks like this:
  // <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
  return {
    render: () => ({
      button: {
        className: "bg-transparent opacity-50 hover:opacity-100",
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
  // I want to create an svg icon that looks like this:
  // <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
  return {
    render: () => ({
      button: {
        className: "bg-red-500 rounded-full p-[6px]",
        onclick: () => props.onclick(),
        style: {
          height: "36px",
          width: "36px"
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

function getNetflixVideoId(url) {
  // This regex looks for digits that come after "/watch/" and before a "?"
  const regex = /\/watch\/(\d+)/
  const match = url.match(regex)

  // If a match is found, return the captured ID (the first captured group)
  return match ? match[1] : null
}

const Timeline = (props, context) => {
  const { getState, setState } = context

  console.log("Timeline", () => getState("scenes"))

  // Sample timeline segments - you can pass these as props or manage them in state
  // let segments = props.segments || [
  //   {
  //     id: 1,
  //     type: "Cut",
  //     left: "10%",
  //     width: "20%",
  //     color: "#ef4444",
  //     borderColor: "rgba(239, 68, 68, 0.5)",
  //     startTime: "0:09",
  //     endTime: "0:27"
  //   },
  //   {
  //     id: 2,
  //     type: "Effect",
  //     left: "40%",
  //     width: "25%",
  //     color: "#a855f7",
  //     borderColor: "rgba(168, 85, 247, 0.5)",
  //     startTime: "0:36",
  //     endTime: "0:58"
  //   }
  // ]
  let segments =
    props.segments ||
    getState("scenes").map((scene, idx) => ({
      ...scene,
      left: `${10 + idx * 10}%`,
      width: `${(scene.endTime - scene.startTime) * 10}px`,
      color:
        scene.type === "skip"
          ? "rgb(220 38 38 / 50%)"
          : scene.type === "blur"
          ? "rgb(22 163 74 / 50%)"
          : scene.type === "mute"
          ? "rgb(251 146 60 / 50%)"
          : "black"
    }))

  // Function to generate time markers for current 100-second interval
  const generateTimeMarkers = (currentTimeSeconds) => {
    const intervalStart = Math.floor(currentTimeSeconds / 100) * 100
    const intervalEnd = intervalStart + 100
    const markers = []

    for (let seconds = intervalStart; seconds <= intervalEnd; seconds += 10) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      markers.push(`${minutes}:${remainingSeconds.toString().padStart(2, "0")}`)
    }

    return markers
  }

  const handleSegmentClick = (segmentId) => {
    console.log(`Segment ${segmentId} clicked - implement delete functionality`)
    // You can implement delete functionality here
    if (props.onSegmentDelete) {
      props.onSegmentDelete(segmentId)
    }
  }

  return {
    render: () => ({
      div: {
        className: "mx-auto max-w-[100%] space-y-4",
        children: [
          {
            div: {
              className: "relative h-[50px] top-[4rem]",
              style: {
                height: "16rem"
              },
              children: [
                // Time markers
                {
                  div: {
                    className:
                      "mb-2 flex justify-between text-3xl text-white bg-black h-[30px]",
                    children: generateTimeMarkers(
                      Math.floor(Number(getState("playTime")) / 1000)
                    ).map((time) => ({
                      div: {
                        className: "p-6",
                        children: {
                          span: {
                            text: time
                          }
                        }
                      }
                    }))
                  }
                },
                {
                  div: {
                    className:
                      "mb-2 flex justify-between text-3xl text-white bg-black h-[10px] relative top-[-5px]",
                    children: Array.from({ length: 11 }).map((_, index) => ({
                      div: {
                        className: "flex flex-col gap-2",
                        children: {
                          span: {
                            text: "|"
                          }
                        }
                      }
                    }))
                  }
                },
                // Timeline container
                {
                  div: {
                    className:
                      "relative h-[50px] cursor-pointer overflow-hidden top-[-10px] bg-black/50",
                    style: {
                      height: "10rem"
                    },
                    children: segments.map((segment) => ({
                      div: {
                        className:
                          "group absolute top-2 bottom-2 cursor-pointer rounded border-2",
                        style: {
                          left: segment.left,
                          width: segment.width,
                          backgroundColor: segment.color,
                          borderColor: "transparent"
                        },
                        title: `${segment.type}: ${segment.startTime} - ${segment.endTime} (Click to delete)`,
                        onclick: () => handleSegmentClick(segment.id),
                        children: [
                          // Label
                          {
                            div: {
                              className:
                                "absolute inset-0 flex items-center justify-center",
                              children: [
                                {
                                  span: {
                                    className:
                                      "rounded px-1 text-2xl text-white capitalize",
                                    text: segment.type
                                  }
                                }
                              ]
                            }
                          },
                          // Left border accent
                          {
                            div: {
                              className:
                                "absolute top-0 left-0 h-full w-1 rounded-l",
                              style: {
                                backgroundColor: segment.color
                              }
                            }
                          }
                        ]
                      }
                    }))
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

// Import the TimeLineToolbar component from the separate file
// const TimeLineToolbar = (props, context) => { ... } // Defined in timelineToolBar.js

const Netflix = (props, context) => {
  const { UtilsManager, getState, setState } = context
  let scenes = []
  let movieId = ""

  console.log("UtilsManager", context)

  db.subscribeQuery(
    {
      $users: {
        $: {
          where: {
            email: "sophek@gmail.com"
          }
        },
        movies: {
          $: {
            where: {
              watch_id: getNetflixVideoId(window.location.href)
            }
          },

          time_codes: {}
        }
      }
    },
    (resp) => {
      if (resp.error) {
        console.log("error", resp.error)
        //renderError(resp.error.message) // Pro-tip: Check you have the right appId!
        return
      }
      if (resp.data) {
        console.log("data", resp.data)
        console.log("watch_id", getNetflixVideoId(window.location.href))
        //render(resp.data)
        scenes = resp.data.$users?.[0]?.movies?.[0]?.time_codes || []
        movieId = resp.data.$users?.[0]?.movies?.[0]?.id || ""
        setState(
          "scenes",
          scenes.map((scene) => ({
            id: scene.id,
            type: scene.type,
            left: `${scene.start * 10}px`,
            width: `${(scene.end - scene.start) * 10}px`,
            color: "#ef4444",
            borderColor: "rgba(239, 68, 68, 0.5)",
            startTime: scene.start,
            endTime: scene.end
          }))
        )
      }
    }
  )

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

  function createLinkDocument(table, documentData, links) {
    let transaction = db.tx[table][id()].update(documentData)

    // Chain multiple links
    Object.entries(links).forEach(([linkName, linkIds]) => {
      transaction = transaction.link({ [linkName]: linkIds })
    })

    return db.transact(transaction)
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
    console.log("UtilsManager", UtilsManager)

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
      //addTimeCode(newScene.name, newScene.start, newScene.end, newScene.type)
      createLinkDocument("time_codes", newScene, {
        movies: [movieId]
      })

      console.log("New scene added:", newScene)
      console.log("scenes sophek", scenes)
      pendingSceneStart = null
      setState("scenes", scenes)
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
        className: "netflix-app w-full top-[20px] right-[100px]",
        children: [
          {
            div: {
              className: "skip-video-icon",
              style: {
                position: "absolute",
                width: "36px",
                height: "36px",
                top: "3rem",
                left: "23%",
                zIndex: "999"
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
          },

          {
            div: {
              className: "timeline-toolbar-container",
              children: () => {
                if (getState("isAnalyzing")) {
                  return {
                    TimeLineToolbar: {}
                  }
                }
              }
            }
          },
          {
            div: {
              className: "relative top-[50px]",
              children: () => {
                if (getState("isAnalyzing")) {
                  return {
                    Timeline: {}
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
