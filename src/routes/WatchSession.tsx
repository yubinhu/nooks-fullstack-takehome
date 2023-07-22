import { useEffect, useState } from "react";
import VideoPlayer from "../components/VideoPlayer";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, TextField, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { io, Socket } from "socket.io-client";

const WatchSession: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0); // [seconds
  const [socket, setSocket] = useState<Socket | null>(null);
  const BACKEND_URL = "http://localhost:8080";

  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate("/create");
    }

    var newSocket = io(BACKEND_URL);
    while (!newSocket) {
      console.log("Error! Socket creation failed, retrying");
      newSocket = io(BACKEND_URL);
    }
    setSocket(newSocket);
    newSocket.emit("join-session", sessionId);
    newSocket.on("welcome", (sessionUrl: string, status: number) => {
      console.log("Welcomed by the server: ", sessionUrl, status);
      setUrl(sessionUrl);
      setStartTime(status);
    });

    // // fallback url
    // setUrl("https://www.youtube.com/watch?v=NX1eKLReSpY");

    // if session ID doesn't exist, you'll probably want to redirect back to the home / create session page
  }, [sessionId]);

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
          </Tooltip>
          <Tooltip title="Create new watch party">
            <Button
              onClick={() => {
                navigate("/create");
              }}
              variant="contained"
              sx={{ whiteSpace: "nowrap", minWidth: "max-content" }}
            >
              <AddCircleOutlineIcon />
            </Button>
          </Tooltip>
        </Box>
        <VideoPlayer url={url} socket={socket as Socket} sessionId={sessionId as string} startTime={startTime}/>;
      </>
    );
  }

  return null;
};

export default WatchSession;
