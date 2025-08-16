// inject.js - Runs in page context to access Netflix API
// This script has access to the page's window object and Netflix API

console.log("🚀 Netflix Injected Script Loaded")

// Function to safely access Netflix API in page context
function getNetflixVideoPlayerInPageContext() {
  try {
    if (window.netflix?.appContext?.state?.playerApp?.getAPI) {
      const api = window.netflix.appContext.state.playerApp.getAPI()
      if (api?.videoPlayer) {
        return api.videoPlayer
      }
    }
    return null
  } catch (error) {
    console.log("Error accessing Netflix API in page context:", error)
    return null
  }
}

// Function to check Netflix loading stages in page context
function checkNetflixLoadingStages() {
  const stages = {
    netflix: !!window.netflix,
    appContext: !!window.netflix?.appContext,
    state: !!window.netflix?.appContext?.state,
    playerApp: !!window.netflix?.appContext?.state?.playerApp,
    getAPI: !!window.netflix?.appContext?.state?.playerApp?.getAPI,
    videoPlayer:
      !!window.netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer
  }

  console.log("🔍 Netflix stages (page context):", stages)
  return stages
}

// Function to wait for Netflix API in page context
function waitForNetflixInPageContext() {
  let attempts = 0
  const maxAttempts = 30
  let delay = 500

  const checkNetflix = () => {
    attempts++
    console.log(
      `🔄 [Page Context] Checking Netflix API (attempt ${attempts}/${maxAttempts})`
    )

    checkNetflixLoadingStages()

    const videoPlayer = getNetflixVideoPlayerInPageContext()
    if (videoPlayer) {
      console.log("✅ [Page Context] Netflix API found!")

      // Send event to content script that Netflix API is ready
      window.dispatchEvent(
        new CustomEvent("NetflixVideoPlayer", {
          detail: {
            ready: true,
            videoPlayer: "available",
            sessionIds: videoPlayer.getAllPlayerSessionIds?.() || []
          }
        })
      )

      // Set up Netflix API access functions
      setupNetflixPageAPI(videoPlayer)
      return
    }

    if (attempts < maxAttempts) {
      delay = Math.min(delay * 1.5, 3000)
      setTimeout(checkNetflix, delay)
    } else {
      console.log(
        "❌ [Page Context] Netflix API not found after maximum attempts"
      )

      // Notify content script that we failed to find the API
      window.dispatchEvent(
        new CustomEvent("NetflixVideoPlayer", {
          detail: {
            ready: false,
            error: "API not found"
          }
        })
      )
    }
  }

  checkNetflix()
}

// Setup Netflix API functions in page context
function setupNetflixPageAPI(videoPlayer) {
  console.log("🎛️ [Page Context] Setting up Netflix API functions")

  // Create API bridge functions
  window.netflixAPI = {
    // Get current player
    getCurrentPlayer: () => {
      try {
        const sessionIds = videoPlayer.getAllPlayerSessionIds()
        if (sessionIds && sessionIds.length > 0) {
          return videoPlayer.getVideoPlayerBySessionId(sessionIds[0])
        }
        return null
      } catch (error) {
        console.error("Error getting current player:", error)
        return null
      }
    },

    // Seek to specific time (in milliseconds)
    seek: (timeMs) => {
      try {
        const player = window.netflixAPI.getCurrentPlayer()
        if (player) {
          player.seek(timeMs)
          console.log(`⏩ Seeked to ${timeMs}ms`)
          return true
        }
        return false
      } catch (error) {
        console.error("Error seeking:", error)
        return false
      }
    },

    // Get current time
    getCurrentTime: () => {
      try {
        const player = window.netflixAPI.getCurrentPlayer()
        if (player) {
          return player.getCurrentTime()
        }
        return null
      } catch (error) {
        console.error("Error getting current time:", error)
        return null
      }
    },

    // Play/Pause
    togglePlayPause: () => {
      try {
        const player = window.netflixAPI.getCurrentPlayer()
        if (player) {
          if (player.isPlaying()) {
            player.pause()
            console.log("⏸️ Paused")
          } else {
            player.play()
            console.log("▶️ Playing")
          }
          return true
        }
        return false
      } catch (error) {
        console.error("Error toggling play/pause:", error)
        return false
      }
    },

    // Get video duration
    getDuration: () => {
      try {
        const player = window.netflixAPI.getCurrentPlayer()
        if (player) {
          return player.getDuration()
        }
        return null
      } catch (error) {
        console.error("Error getting duration:", error)
        return null
      }
    },

    // Mute/Unmute
    setVolume: (volume) => {
      try {
        const player = window.netflixAPI.getCurrentPlayer()
        if (player) {
          player.setVolume(volume)
        }
      } catch (error) {
        console.error("Error setting volume:", error)
      }
    }
  }

  // Listen for commands from content script
  window.addEventListener("NetflixCommand", (event) => {
    const { command, data } = event.detail
    console.log(`🎮 [Page Context] Received command: ${command}`, data)

    switch (command) {
      case "seek":
        window.netflixAPI.seek(data.time)
        break
      case "togglePlayPause":
        window.netflixAPI.togglePlayPause()
        break
      case "getCurrentTime":
        const currentTime = window.netflixAPI.getCurrentTime()
        window.dispatchEvent(
          new CustomEvent("NetflixResponse", {
            detail: { command: "getCurrentTime", result: currentTime }
          })
        )
        break
      case "mute":
        console.log("muting from inject")
        window.netflixAPI.setVolume(0)
        break
      case "unmute":
        console.log("unmuting from inject")
        window.netflixAPI.setVolume(1)
        break
      case "getDuration":
        const duration = window.netflixAPI.getDuration()
        window.dispatchEvent(
          new CustomEvent("NetflixResponse", {
            detail: { command: "getDuration", result: duration }
          })
        )
        break

      case "getPlaybackState":
        const player = window.netflixAPI.getCurrentPlayer()
        console.log({ sophek: player.isPlaying() })
        window.dispatchEvent(
          new CustomEvent("NetflixResponse", {
            detail: {
              command: "getPlaybackState",
              result: player.isPlaying() ? "playing" : "paused"
            }
          })
        )
        break
    }
  })

  console.log("🎯 [Page Context] Netflix API bridge ready!")

  // Monitor playback state changes and notify content script automatically
  try {
    let lastIsPlaying = undefined
    setInterval(() => {
      try {
        const player = window.netflixAPI.getCurrentPlayer()
        if (!player) return
        const isPlaying = player.isPlaying()
        if (lastIsPlaying === undefined || lastIsPlaying !== isPlaying) {
          lastIsPlaying = isPlaying
          const currentTime = player.getCurrentTime?.()
          window.dispatchEvent(
            new CustomEvent("NetflixResponse", {
              detail: {
                command: "getPlaybackState",
                result: isPlaying ? "playing" : "paused",
                timeMs: currentTime ?? null
              }
            })
          )
        }
      } catch (err) {
        // swallow
      }
    }, 500)
  } catch (e) {
    console.log("Failed to start playback state monitor", e)
  }
}

// Only run on Netflix pages
if (window.location.hostname.includes("netflix.com")) {
  console.log(
    "🎬 [Page Context] Netflix page detected, starting API detection..."
  )

  // Start detection immediately
  waitForNetflixInPageContext()

  // Also listen for navigation changes (Netflix SPA)
  let lastUrl = location.href
  new MutationObserver(() => {
    const url = location.href
    if (url !== lastUrl) {
      lastUrl = url
      console.log("🌐 [Page Context] URL changed:", url)

      // Reset and try again on navigation
      if (url.includes("/watch/")) {
        setTimeout(() => {
          console.log(
            "🎥 [Page Context] Video page detected, rechecking API..."
          )
          waitForNetflixInPageContext()
        }, 2000)
      }
    }
  }).observe(document, { subtree: true, childList: true })
} else {
  console.log(
    "ℹ️ [Page Context] Not a Netflix page, inject script will not run"
  )
}
