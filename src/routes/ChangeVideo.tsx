import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, TextField } from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";
import { env } from "process";


const CreateSession: React.FC = () => {
  const navigate = useNavigate();
  const [newUrl, setNewUrl] = useState("");
  const { sessionId } = useParams();
  const BACKEND_URL = env.BACKEND_URL || "http://localhost:8080";

  const createSession = async () => {
    console.log("changing session", sessionId, "to new url:", newUrl);
    const socket = io(BACKEND_URL);
    socket.emit("change-video", sessionId, newUrl);
    
    setNewUrl("");
    navigate(`/watch/${sessionId}`);
  };

  return (
    <Box width="100%" maxWidth={600} display="flex" gap={1} marginTop={1}>
      <TextField
        label="Youtube URL"
        variant="outlined"
        value={newUrl}
        onChange={(e) => setNewUrl(e.target.value)}
        fullWidth
      />
      <Button
        disabled={!newUrl}
        onClick={createSession}
        size="small"
        variant="contained"
      >
        Create a session
      </Button>
    </Box>
  );
};

export default CreateSession;