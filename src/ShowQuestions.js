import React, { useState, useEffect } from "react";
import {
  TextField,
  Paper,
  Typography,
  Button,
  List,
  Box,
  ListItemText,
  Collapse,
  ListItemButton,
  Grid,
} from "@mui/material";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import CheckCircle from "@mui/icons-material/CheckCircle";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { green, orange } from "@mui/material/colors";

const ShowQuestions = (props) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [relevancyStatus, setRelevancyStatus] = useState({});
  const [globalRelevancyFlag, setGlobalRelevancyFlag] = useState(true);

  useEffect(() => {
    setGlobalRelevancyFlag(
      Object.values(relevancyStatus).every((status) => status !== "irrelevant")
    );
  }, [relevancyStatus]);

  const handleNext = () => {
    if (currentQuestionIndex < props.data.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleBlur = async () => {
    const question = props.data[currentQuestionIndex];
    if (
      question.StandardAnswer !== null &&
      question.StandardAnswer.trim !== ""
    ) {
      const isRelevant = await props.relevancyCheck(
        question.StandardAnswer,
        question.StandardQuestion,
        question.Id
      );
      setRelevancyStatus((prev) => ({
        ...prev,
        [currentQuestionIndex]: isRelevant ? "relevant" : "irrelevant",
      }));
      if (isRelevant) {
        const globalRelevancyFlag = !props.data.some((item) => !item.relevant);
        setGlobalRelevancyFlag(globalRelevancyFlag);
      } else {
        setGlobalRelevancyFlag(false);
      }
    }
  };

  return (
    <Grid container spacing={2} style={{ padding: "20px" }}>
      <Grid item xs={12} md={3} style={{ maxHeight: "80vh" }}>
        <Paper
          style={{
            padding: "15px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "10px", alignSelf: "center" }}>
            <Button
              onClick={() => setOpen(!open)}
              variant="outlined"
              endIcon={open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            >
              Irog List
            </Button>
          </div>
          <Collapse in={open} style={{ flexGrow: 1, overflowY: "auto" }}>
            <List
              sx={{
                width: "100%",
                bgcolor: "background.paper",
              }}
            >
              {props.data.map((question, index) => (
                <ListItemButton
                  key={index}
                  selected={index === currentQuestionIndex}
                  onClick={() => handleJumpToQuestion(index)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <div
                          style={{
                            backgroundColor:
                              relevancyStatus[index] === "relevant" ||
                              (question.isModified === false &&
                                question.StandardAnswer !== null)
                                ? "green"
                                : "orange",
                            borderRadius: "50%",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginLeft: "10px",
                            color: "white",
                            fontSize: "small",
                            marginRight: "3px",
                          }}
                        >
                          {index + 1}
                        </div>
                        {`Interrogatory No ${question.SequenceNumber}`}

                        {/* {relevancyStatus[index] === "relevant" && (
                          <CheckCircle
                            fontSize="small"
                            style={{ color: "green", marginLeft: "10px" }}
                          />
                        )}
                        {relevancyStatus[index] === "irrelevant" && (
                          <WarningAmber
                            fontSize="small"
                            style={{ color: "orange", marginLeft: "10px" }}
                          />
                        )} */}
                      </Box>
                    }
                    secondary={
                      relevancyStatus[index] === "relevant" ||
                      (question.isModified === false &&
                        question.StandardAnswer !== null)
                        ? "Answered"
                        : "Not Answered"
                    }
                    secondaryTypographyProps={{
                      style: {
                        color:
                          relevancyStatus[index] === "relevant" ||
                          (question.isModified === false &&
                            question.StandardAnswer !== null)
                            ? "green"
                            : "orange",
                        fontStyle: "italic",
                        marginLeft: "15%",
                      },
                    }}
                    // style={{
                    //   color: question.StandardAnswer ? "green" : "inherit",
                    // }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </Paper>
      </Grid>
      <Grid item xs={12} md={9}>
        <Paper style={{ padding: "20px", height: "100%" }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            style={{ marginBottom: "20px" }}
          >
            {currentQuestionIndex +
              1 +
              ".  " +
              props.data[currentQuestionIndex].StandardQuestion}
          </Typography>
          <TextField
            id={props.data[currentQuestionIndex].OriginalQuestion}
            name={props.data[currentQuestionIndex].Id.toString()}
            label="Your response"
            sx={{ m: 1, width: "95%" }}
            placeholder="Placeholder"
            multiline
            rows={3}
            onBlur={handleBlur}
            onChange={props.handleValueChange}
            value={props.data[currentQuestionIndex].StandardAnswer || ""}
            style={{ marginBottom: "20px" }}
          />
          {props.data[currentQuestionIndex].relevancyMessage !== undefined &&
            props.data[currentQuestionIndex].relevancyStatus ===
              "irrelevant" && (
              <p style={{ color: "orangered", fontStyle: "italic" }}>
                <b>Feedback: </b>
                {props.data[currentQuestionIndex].relevancyMessage}
              </p>
            )}
          <div>
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="contained"
              style={{ marginRight: "10px" }}
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentQuestionIndex === props.data.length - 1}
              variant="contained"
              style={{ marginRight: "10px" }}
            >
              Next
            </Button>
          </div>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ShowQuestions;
