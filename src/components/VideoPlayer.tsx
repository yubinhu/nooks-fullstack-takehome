import { Box, Button } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { Socket } from "socket.io-client";

interface VideoPlayerProps {
  url: string;
  hideControls?: boolean;
  socket: Socket;
  sessionId: string;
  startTime: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, hideControls, socket, sessionId, startTime}) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastPause, setLastPause] = useState(0); 
  const [lastPlay, setLastPlay] = useState(0); 
  const [lastProgress, setLastProgress] = useState(0); 
  const player = useRef<ReactPlayer>(null);
  const delayAllowance = 0.2;
  const progressAllowance = 1;
  const seekThreshold = 0.001;
  
  useEffect(() => {
    socket.off("welcome");
    socket.off("server-welcome");

    socket.on("broadcast-play", () => {
      console.log('play signal received');
      setPaused(false);
    })

    socket.on("sync-response", (seconds: number) => {
      console.log('sync response received. Current time: ', player.current?.getCurrentTime(), ' seek to: ', seconds, ' difference: ', Math.abs(player.current?.getCurrentTime() as number - seconds));
      seekToWithThreshold(seconds);
      setPaused(false);
    });

    socket.on("sync-request", () => {
      console.log('sync request received, pausing video');
      setPaused(true);
      socket.emit("sync-response", sessionId, player.current?.getCurrentTime() || 0)
    });
  
    socket.on("broadcast-pause", () => {
      console.log('pause signal received');
      setPaused(true);
    })
  
    socket.on("broadcast-seek", (seconds: number) => {
      console.log('seek request received. Current time: ', player.current?.getCurrentTime(), ' seek to: ', seconds, ' difference: ', Math.abs(player.current?.getCurrentTime() as number - seconds));
      seekToWithThreshold(seconds);
    });
  
    socket.on("welcome-request",() => {
      console.log('welcome request received, pausing video');
      setPaused(true);
      socket.emit("welcome", sessionId, url, player.current?.getCurrentTime() || 0)
    });
  });

  const seekToWithThreshold = (seconds: number) => {
    const currentTime = player.current?.getCurrentTime() as number;
    if (Math.abs(currentTime - seconds) > seekThreshold) {
      console.log('seeking to ', seconds)
      player.current?.seekTo(seconds);
    } else {
      // do not seek. log the event
      console.log('Not seeking because of threshold. Current time: ', currentTime, ' seek to: ', seconds, ' difference: ', Math.abs(currentTime - seconds), ' threshold: ', seekThreshold)
    }
  }

  const handleReady = () => {
    setIsReady(true);
    seekToWithThreshold(startTime);
  };

  const handleWatchSession = () => {
    console.log("Starting watch session, emitting sync request");
    console.log("debug", paused)
    socket.emit("sync-request", sessionId);
    setHasJoined(true);
  };

  const handleEnd = () => {
    console.log("Video ended");
  };

  // const handleSeek = (seconds: number) => {
  //   // Ideally, the seek event would be fired whenever the user moves the built in Youtube video slider to a new timestamp.
  //   // However, the youtube API no longer supports seek events (https://github.com/cookpete/react-player/issues/356), so this no longer works

  //   // You'll need to find a different way to detect seeks (or just write your own seek slider and replace the built in Youtube one.)
  //   // Note that when you move the slider, you still get play, pause, buffer, and progress events, can you use those?

  //   console.log(
  //     "This never prints because seek decetion doesn't work: ",
  //     seconds
  //   );
  // };

  const handlePlay = () => {
    const playTime = player.current?.getCurrentTime()
    console.log(
      "User played video at time: ",
      playTime,
      " last play: ",
      lastPlay
    );
    
    socket.emit("broadcast-play", sessionId)
    setLastPlay(playTime as number)
  };

  const handlePause = () => {
    const pauseTime = player.current?.getCurrentTime()
    console.log(
      "User paused video at time: ",
      pauseTime
    );

    socket.emit("broadcast-pause", sessionId)
    setLastPause(pauseTime as number)
  };

  const handleBuffer = () => {
    console.log("Video buffer started");
    const currentTime = player.current?.getCurrentTime()
    console.log("debug", currentTime)
    if (currentTime === undefined || currentTime < 0.01 || lastProgress < 0.01) {
      // exception for the weird non-stop buffering at the start of the video
      console.log('buffering at the start of the video, not pausing')
    } else {
      console.log("debug buffer", lastProgress, currentTime, Math.abs(lastProgress - currentTime), progressAllowance, Math.abs(lastProgress - currentTime) > progressAllowance);
      if (Math.abs(lastProgress - currentTime) > progressAllowance) {
        // this is a seek event
        console.log('seek event detected - buffering far from last progress: seek to ', currentTime)
        socket.emit("broadcast-seek", sessionId, currentTime);
      }
      setPaused(true)
    }
    
  };

  const handleBufferEnd = () => {
    console.log("Video buffered");
    setPaused(false);
  };

  const handleProgress = (state: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }) => {
    console.log("Video progress: ", state, " last pause: ", lastPause);

    if (paused && state.playedSeconds - lastPause > delayAllowance) {
      // this is a seek event
      console.log('seek event detected - progress event when paused: seek to ', state.playedSeconds)
      socket.emit("broadcast-seek", sessionId, state.playedSeconds);
    }
    setLastProgress(state.playedSeconds);
    // socket.emit("broadcast-progress", sessionId, state);
  };

  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box
        width="100%"
        height="100%"
        display={hasJoined ? "flex" : "none"}
        flexDirection="column"
      >
        <ReactPlayer
          ref={player}
          url={url}
          playing={hasJoined && !paused}
          controls={!hideControls}
          onReady={handleReady}
          onEnded={handleEnd}
          // onSeek={handleSeek}
          onPlay={handlePlay}
          onPause={handlePause}
          onBuffer={handleBuffer}
          onBufferEnd={handleBufferEnd}
          onProgress={handleProgress}
          width="100%"
          height="100%"
          style={{ pointerEvents: hideControls ? "none" : "auto" }}
        />
      </Box>
      {!hasJoined && isReady && (
        // Youtube doesn't allow autoplay unless you've interacted with the page already
        // So we make the user click "Join Session" button and then start playing the video immediately after
        // This is necessary so that when people join a session, they can seek to the same timestamp and start watching the video with everyone else
        <Button
          variant="contained"
          size="large"
          onClick={handleWatchSession}
        >
          Watch Session
        </Button>
      )}
    </Box>
  );
};

export default VideoPlayer;
