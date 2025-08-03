// Content script that runs on web pages
// Note: Juris is available globally when loaded in browser context
console.log("Content script loaded - Hello World!");

const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

function initJuris() {
  const juris = new Juris({
    components: {
      Netflix,
    },

    layout: {
      div: {
        children: [{ Netflix: {} }],
      },
    },

    states: {
      playTime: 0,
      isPlaying: "paused",
    },
  });
  return juris;
}

// Create a simple "Hello World" notification
function jurisApp() {
  // Create a div element for the hello world message
  const app = document.createElement("div");
  app.id = "juris-extension";

  // Add the element to the page
  document.body.appendChild(app);
}

function skipScene() {
  window.dispatchEvent(
    new CustomEvent("NetflixCommand", {
      detail: { command: "seek", data: { time: 60000 } }, // Seek to 1 minute
    })
  );
}

const Netflix = (props, context) => {
  const { getState, setState } = context;

  const scenesList = [
    {
      name: "Scene 1",
      seconds: 60,
    },
    {
      name: "Scene 2",
      seconds: 120,
    },
    {
      name: "Scene 3",
      seconds: 180,
    },
    {
      name: "Scene 4",
      seconds: 240,
    },
  ];

  // setInterval(() => {
  //   const currentTime = getState("playTime", 0);
  //   const scene = scenesList.find((scene) => currentTime >= scene.seconds);
  //   if (scene) {
  //     skipScene(scene.seconds);
  //     setState("playTime", 0);
  //   }
  // }, 1000);

  function skipScene(seconds) {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "seek", data: { time: seconds * 1000 } }, // Seek to 1 minute
      })
    );
  }
  function playVideo() {
    window.dispatchEvent(
      new CustomEvent("NetflixCommand", {
        detail: { command: "togglePlayPause" },
      })
    );
  }

  // Enhanced communication with injected script
  window.addEventListener("NetflixVideoPlayer", (e) => {
    console.log("🎬 [Content Script] Netflix Video Player event received:", e);

    if (e.detail.ready) {
      console.log("✅ [Content Script] Netflix API is ready in page context!");
      console.log("📊 [Content Script] Session IDs:", e.detail.sessionIds);

      console.log(e);

      // Check if video is playing every 1 second
      // setInterval(() => {
      //   window.dispatchEvent(
      //     new CustomEvent("NetflixCommand", {
      //       detail: { command: "getPlaybackState" },
      //     })
      //   );
      // }, 1000);

      //Example: Send a command to the injected script
      setInterval(() => {
        window.dispatchEvent(
          new CustomEvent("NetflixCommand", {
            detail: { command: "getPlaybackState" },
          })
        );
      }, 1000);
    } else {
      console.log(
        "❌ [Content Script] Netflix API failed to initialize:",
        e.detail.error
      );
    }
  });

  // Listen for responses from injected script
  window.addEventListener("NetflixResponse", (e) => {
    console.log("📡 [Content Script] Netflix response:", e.detail);

    const { command, result } = e.detail;
    switch (command) {
      case "getCurrentTime":
        console.log(`⏰ Current video time: ${result}ms`);
        setState("playTime", result);
        break;
      case "getDuration":
        console.log(`⏱️ Video duration: ${result}ms`);
        break;
      case "getPlaybackState":
        console.log(`🎥 Video is ${result ? "playing" : "paused"}`);
        setState("isPlaying", result);
        break;
      case "play":
        console.log("🎥 Video is playing");
        // play the video

        break;
    }
  });

  return {
    render: () => ({
      div: {
        className: "netflix-app",
        children: [
          {
            h1: {
              className: "netflix-title",
              text: "Netflix",
            },
          },
          {
            button: {
              className: "btn btn-primary",
              text: () => `Count: ${getState("playTime", 0)}`,
              onclick: () => skipScene(60),
            },
          },
          {
            button: {
              className: "btn btn-primary",
              text: () => `Playing: ${getState("isPlaying")}`,
              onclick: () => playVideo(),
            },
          },
        ],
      },
    }),
  };
};

// Initialize Juris app

// Wait for the DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jurisApp);
} else {
  // Netflix-specific functionality
  if (window.location.hostname.includes("netflix.com")) {
    console.log(
      "🎬 Netflix page detected, initializing video player controls..."
    );
    const juris = initJuris();

    jurisApp();
    // Render the app
    juris.render("#juris-extension");

    // Global access for debugging
    window.juris = juris;
  }
}

// Also log to console for debugging
console.log(
  "Juris Extension content script is running on:",
  window.location.href
);
