import { useEffect, useState } from "react";
import VideoPlayer from "../components/VideoPlayer";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, TextField, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "../constants";

const WatchSession: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0); // [seconds

  const [linkCopied, setLinkCopied] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // if session ID doesn't exist, you'll probably want to redirect back to the home / create session page
    if (!sessionId) {
      navigate("/create");
    }
    
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);
    newSocket.emit("join-session", sessionId);

    newSocket.on("welcome", (sessionUrl: string, status: number) => {
      console.log("Welcomed by a user: ", sessionUrl, status);
      setUrl(sessionUrl);
      setStartTime(status);
    });

    newSocket.on("server-welcome", (sessionUrl: string, status: number) => {
      console.log("Welcomed by the server: ", sessionUrl, status);
      setUrl(sessionUrl);
      setStartTime(status);
    });

    newSocket.on("change-video", (newUrl) => {
      console.log("changing video to: ", newUrl);
      setStartTime(0);
      setUrl(newUrl);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, url, navigate]);

  if (!!url) {
    return (
      <>
        <Box
          width="100%"
          maxWidth={1000}
          display="flex"
          gap={1}
          marginTop={1}
          alignItems="center"
        >
          <TextField
            label="Youtube URL"
            variant="outlined"
            value={url}
            inputProps={{
              readOnly: true,
              disabled: true,
            }}
            fullWidth
          />
          <Tooltip title={linkCopied ? "Link copied" : "Copy link to share"}>
            <span>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                disabled={linkCopied}
                variant="contained"
                sx={{ whiteSpace: "nowrap", minWidth: "max-content" }}
              >
                <LinkIcon />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Create new watch party">
            <Button
              onClick={() => {
                navigate(`/recreate/${sessionId}`);
              }}
              variant="contained"
              sx={{ whiteSpace: "nowrap", minWidth: "max-content" }}
            >
              <AddCircleOutlineIcon />
            </Button>
          </Tooltip>
        </Box>
        <VideoPlayer key={url} url={url} socket={socket as Socket} sessionId={sessionId as string} startTime={startTime}/>;
      </>
    );
  }

  return null;
};

export default WatchSession;
