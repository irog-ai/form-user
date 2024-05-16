import React from "react";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

const ShowQuestions = (props) => {
  return (
    <div>
      {props.data.map((question, index) => (
        <Paper key={index} style={{ marginBottom: "2%", marginTop: "2%" }}>
          <Typography
            style={{ margin: "10px", padding: "10px" }}
            variant="subtitle1"
            gutterBottom
          >
            {question.SequenceNumber + ".) " + question.OriginalQuestion}
          </Typography>
          {/* <p>{question.StandardAnswerWeb}</p> */}
          <TextField
            id={question.OriginalQuestion}
            name={question.Id.toString()}
            label="Your response"
            sx={{ m: 1, width: "95%" }}
            placeholder="Placeholder"
            multiline
            rows={3}
            onChange={props.handleValueChange}
            value={question.StandardAnswer ? question.StandardAnswer : ""}
            style={{ padding: "10px", paddingBottom: "20px" }}
          />
        </Paper>
      ))}
    </div>
  );
};

export default ShowQuestions;
