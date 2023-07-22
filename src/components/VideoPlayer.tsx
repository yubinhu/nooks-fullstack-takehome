import { Box, Button } from "@mui/material";
import React, { useRef, useState } from "react";
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
  const player = useRef<ReactPlayer>(null);

  socket.on("broadcast-play", () => {
    console.log('play signal received');
    setPaused(false);
  })

  socket.on("broadcast-pause", () => {
    console.log('play signal received');
    setPaused(true);
  })

  socket.on("broadcast-seek", (seconds: number) => {
    console.log('seek request received. Current time: ', player.current?.getCurrentTime(), ' seek to: ', seconds, ' difference: ', Math.abs(player.current?.getCurrentTime() as number - seconds));
    player.current?.seekTo(seconds);
  });

  socket.on("welcome-request",(callback) => {
    console.log('welcome request received');
    callback({'url': url, 'status': player.current?.getCurrentTime()});
  })

  const handleReady = () => {
    setIsReady(true);
    player.current?.seekTo(startTime);
  };

  const handleEnd = () => {
    console.log("Video ended");
  };

  const handleSeek = (seconds: number) => {
    // Ideally, the seek event would be fired whenever the user moves the built in Youtube video slider to a new timestamp.
    // However, the youtube API no longer supports seek events (https://github.com/cookpete/react-player/issues/356), so this no longer works

    // You'll need to find a different way to detect seeks (or just write your own seek slider and replace the built in Youtube one.)
    // Note that when you move the slider, you still get play, pause, buffer, and progress events, can you use those?

    console.log(
      "This never prints because seek decetion doesn't work: ",
      seconds
    );
  };

  const handlePlay = () => {
    console.log(
      "User played video at time: ",
      player.current?.getCurrentTime()
    );

    if (!paused) {
      // this is a seek event
      // console.log('seek event detected - play event when playing: seek to ', player.current?.getCurrentTime() || 0)
      // socket.emit("broadcast-seek", sessionId, player.current?.getCurrentTime() || 0)
    } else {
      // this is a play event
      socket.emit("broadcast-play", sessionId)
      setPaused(false)
    }
  };

  const handlePause = () => {
    const pauseTime = player.current?.getCurrentTime()
    console.log(
      "User paused video at time: ",
      pauseTime
    );

    socket.emit("broadcast-pause", sessionId)
    setPaused(true)
    setLastPause(pauseTime as number)
  };

  const handleBuffer = () => {
    console.log("Video buffered");
  };

  const handleProgress = (state: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }) => {
    console.log("Video progress: ", state);

    if (paused && state.playedSeconds - lastPause > 0.2) {
      // this is a seek event
      console.log('seek event detected - progress event when paused: seek to ', state.playedSeconds)
      socket.emit("broadcast-seek", sessionId, state.playedSeconds);
    }
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
          onClick={() => setHasJoined(true)}
        >
          Watch Session
        </Button>
      )}
    </Box>
  );
};

export default VideoPlayer;
