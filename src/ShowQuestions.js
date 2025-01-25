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


const ShowQuestions = (props) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [relevancyStatus, setRelevancyStatus] = useState({});
  const [relevancyMessages, setRelevancyMessages] = useState({});

  // useEffect(() => {
  //   setGlobalRelevancyFlag(
  //     Object.values(relevancyStatus).every((status) => status !== "irrelevant")
  //   );
  // }, [relevancyStatus]);

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

  const handleBlur = async (mainQuestionId, subQuestion) => {
    if (
      subQuestion.UserResponse !== null &&
      subQuestion.UserResponse.trim() !== ""
    ) {
      const isRelevant = await props.relevancyCheck(
        subQuestion.UserResponse,
        subQuestion.Response,
        mainQuestionId,
        subQuestion.Id
      );

      // Update subquestion's relevancy status
      //subQuestion.relevancyStatus = isRelevant ? "relevant" : "irrelevant";
      //subQuestion.relevancyMessage = isRelevant ? "" : "This answer is not relevant to the question.";

      const currentQuestion = props.data.find(q => q.Id === mainQuestionId);
      // Check if ALL subquestions are answered AND relevant
      const allSubQuestionsComplete = currentQuestion.subQuestions.every(
        sq => sq.UserResponse !== null && 
             sq.UserResponse.trim() !== "" && 
             sq.relevancyStatus === "relevant"
      );

      // Update the question's overall relevancy status
      currentQuestion.relevancyStatus = allSubQuestionsComplete ? "relevant" : "irrelevant";

      // Force a re-render
      setRelevancyStatus(prev => ({
        ...prev,
        [mainQuestionId]: allSubQuestionsComplete ? "relevant" : "irrelevant"
      }));
    }
  };

  const currentQuestion = props.data[currentQuestionIndex];

  return (
    <Grid container spacing={2} style={{ padding: "20px" }}>
      <Grid item xs={12} md={3} style={{ maxHeight: "120vh" }}>
        <Paper
          style={{
            padding: "15px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Button
            onClick={() => setOpen(!open)}
            variant="outlined"
            endIcon={open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            style={{ alignSelf: "center", marginBottom: "10px" }}
          >
            Irog List
          </Button>
          <Collapse in={open} style={{ flexGrow: 1, overflowY: "auto" }}>
            <List sx={{ width: "100%", bgcolor: "background.paper" }}>
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
                              (!question.subQuestions.some(sq => !sq.UserResponse || sq.UserResponse.trim() === ""))
                                ? (relevancyStatus[question.Id] === "irrelevant" ? "orange" : "green")
                                : question.subQuestions.some(sq => sq.UserResponse && sq.UserResponse.trim() !== "")
                                  ? "orange"
                                  : "#666",
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
                      </Box>
                    }
                    secondary={
                      (!question.subQuestions.some(sq => !sq.UserResponse || sq.UserResponse.trim() === ""))
                        ? (relevancyStatus[question.Id] === "irrelevant" ? "In Progress" : "Answered")
                        : question.subQuestions.some(sq => sq.UserResponse && sq.UserResponse.trim() !== "")
                          ? "In Progress" 
                          : "Not Answered"
                    }
                    secondaryTypographyProps={{
                      style: {
                        color:
                          (!question.subQuestions.some(sq => !sq.UserResponse || sq.UserResponse.trim() === ""))
                            ? (relevancyStatus[question.Id] === "irrelevant" ? "orange" : "green")
                            : question.subQuestions.some(sq => sq.UserResponse && sq.UserResponse.trim() !== "")
                              ? "orange"
                              : "#666",
                        fontStyle: "italic",
                        marginLeft: "15%",
                      },
                    }}
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
            variant="h6"
            gutterBottom
            style={{ marginBottom: "20px" }}
          >
            {`Interrogatory No ${currentQuestion.SequenceNumber}`}
          </Typography>
          {currentQuestion.subQuestions.map((subQuestion, subQuestionIndex) => (
            <div key={subQuestionIndex}>
              <Typography
                variant="subtitle1"
                gutterBottom
                style={{ 
                  marginTop: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {subQuestion.UserResponse && subQuestion.UserResponse.trim() !== "" ? (
                  subQuestion.IsModified === 0 ? (
                    <CheckCircle fontSize="small" color="success"/>
                  ) : subQuestion.relevancyStatus === "relevant" ? (
                    <CheckCircle fontSize="small" color="success"/>
                  ) : (
                    <WarningAmber fontSize="small" color="warning"/>
                  )
                ) : null}
                <span>
                  {currentQuestionIndex + 1}.{subQuestionIndex + 1}{" "} 
                  {subQuestion.Response}
                </span>
                {subQuestion.UserResponse && subQuestion.UserResponse.trim() !== "" && (
                  <span style={{ 
                    marginLeft: "10px", 
                    color: subQuestion.relevancyStatus === "relevant" ? "green" : "red",
                    fontSize: "0.9em",
                    fontStyle: "italic"
                  }}>
                  </span>
                )}
              </Typography>
              <TextField
                id={subQuestion.OriginalQuestion}
                name={currentQuestion.Id.toString()+"-"+subQuestion.Id.toString()}
                label="Your response"
                sx={{ m: 1, width: "95%" }}
                placeholder="Placeholder"
                multiline
                rows={2}
                onBlur={() => handleBlur(currentQuestion.Id, subQuestion)}
                onChange={props.handleValueChange}
                value={subQuestion.UserResponse || ""}
                style={{ marginBottom: "20px" }}
              />
              {subQuestion.relevancyStatus === "irrelevant" && (
                <Typography
                  variant="body2"
                  style={{ color: "red", fontStyle: "italic" }}
                >
                  {subQuestion.relevancyMessage}
                </Typography>
              )}
            </div>
          ))}
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
















// import React, { useState, useEffect } from "react";
// import {
//   TextField,
//   Paper,
//   Typography,
//   Button,
//   List,
//   Box,
//   ListItemText,
//   Collapse,
//   ListItemButton,
//   Grid,
// } from "@mui/material";
// import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
// import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
// import CheckCircle from "@mui/icons-material/CheckCircle";
// import WarningAmber from "@mui/icons-material/WarningAmber";
// import { green, orange } from "@mui/material/colors";

// const ShowQuestions = (props) => {
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [open, setOpen] = useState(true);
//   const [relevancyStatus, setRelevancyStatus] = useState({});
//   const [globalRelevancyFlag, setGlobalRelevancyFlag] = useState(true);

//   useEffect(() => {
//     setGlobalRelevancyFlag(
//       Object.values(relevancyStatus).every((status) => status !== "irrelevant")
//     );
//   }, [relevancyStatus]);

//   const handleNext = () => {
//     if (currentQuestionIndex < props.data.length - 1) {
//       setCurrentQuestionIndex(currentQuestionIndex + 1);
//     }
//   };

//   const handlePrevious = () => {
//     if (currentQuestionIndex > 0) {
//       setCurrentQuestionIndex(currentQuestionIndex - 1);
//     }
//   };

//   const handleJumpToQuestion = (index) => {
//     setCurrentQuestionIndex(index);
//   };

//   const handleBlur = async () => {
//     const question = props.data[currentQuestionIndex];
//     if (
//       question.StandardAnswer !== null &&
//       question.StandardAnswer.trim !== ""
//     ) {
//       const isRelevant = await props.relevancyCheck(
//         question.StandardAnswer,
//         question.StandardQuestion,
//         question.Id
//       );
//       setRelevancyStatus((prev) => ({
//         ...prev,
//         [currentQuestionIndex]: isRelevant ? "relevant" : "irrelevant",
//       }));
//       if (isRelevant) {
//         const globalRelevancyFlag = !props.data.some((item) => !item.relevant);
//         setGlobalRelevancyFlag(globalRelevancyFlag);
//       } else {
//         setGlobalRelevancyFlag(false);
//       }
//     }
//   };

//   return (
//     <Grid container spacing={2} style={{ padding: "20px" }}>
//       <Grid item xs={12} md={3} style={{ maxHeight: "80vh" }}>
//         <Paper
//           style={{
//             padding: "15px",
//             height: "100%",
//             display: "flex",
//             flexDirection: "column",
//           }}
//         >
//           <div style={{ marginBottom: "10px", alignSelf: "center" }}>
//             <Button
//               onClick={() => setOpen(!open)}
//               variant="outlined"
//               endIcon={open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
//             >
//               Irog List
//             </Button>
//           </div>
//           <Collapse in={open} style={{ flexGrow: 1, overflowY: "auto" }}>
//             <List
//               sx={{
//                 width: "100%",
//                 bgcolor: "background.paper",
//               }}
//             >
//               {props.data.map((question, index) => (
//                 <ListItemButton
//                   key={index}
//                   selected={index === currentQuestionIndex}
//                   onClick={() => handleJumpToQuestion(index)}
//                 >
//                   <ListItemText
//                     primary={
//                       <Box display="flex" alignItems="center">
//                         <div
//                           style={{
//                             backgroundColor:
//                               relevancyStatus[index] === "relevant" ||
//                               (question.IsModified === 0 &&
//                                 question.StandardAnswer !== null)
//                                 ? "green"
//                                 : "orange",
//                             borderRadius: "50%",
//                             width: "24px",
//                             height: "24px",
//                             display: "flex",
//                             justifyContent: "center",
//                             alignItems: "center",
//                             marginLeft: "10px",
//                             color: "white",
//                             fontSize: "small",
//                             marginRight: "3px",
//                           }}
//                         >
//                           {index + 1}
//                         </div>
//                         {`Interrogatory No ${question.SequenceNumber}`}

//                         {/* {relevancyStatus[index] === "relevant" && (
//                           <CheckCircle
//                             fontSize="small"
//                             style={{ color: "green", marginLeft: "10px" }}
//                           />
//                         )}
//                         {relevancyStatus[index] === "irrelevant" && (
//                           <WarningAmber
//                             fontSize="small"
//                             style={{ color: "orange", marginLeft: "10px" }}
//                           />
//                         )} */}
//                       </Box>
//                     }
//                     secondary={
//                       relevancyStatus[index] === "relevant" ||
//                       (question.IsModified === 0 &&
//                         question.StandardAnswer !== null)
//                         ? "Answered"
//                         : "Not Answered"
//                     }
//                     secondaryTypographyProps={{
//                       style: {
//                         color:
//                           relevancyStatus[index] === "relevant" ||
//                           (question.IsModified === 0 &&
//                             question.StandardAnswer !== null)
//                             ? "green"
//                             : "orange",
//                         fontStyle: "italic",
//                         marginLeft: "15%",
//                       },
//                     }}
//                     // style={{
//                     //   color: question.StandardAnswer ? "green" : "inherit",
//                     // }}
//                   />
//                 </ListItemButton>
//               ))}
//             </List>
//           </Collapse>
//         </Paper>
//       </Grid>
//       <Grid item xs={12} md={9}>
//         <Paper style={{ padding: "20px", height: "100%" }}>
//           <Typography
//             variant="subtitle1"
//             gutterBottom
//             style={{ marginBottom: "20px" }}
//           >
//             {currentQuestionIndex +
//               1 +
//               ".  " +
//               props.data[currentQuestionIndex].StandardQuestion}
//           </Typography>
//           <TextField
//             id={props.data[currentQuestionIndex].OriginalQuestion}
//             name={props.data[currentQuestionIndex].Id.toString()}
//             label="Your response"
//             sx={{ m: 1, width: "95%" }}
//             placeholder="Placeholder"
//             multiline
//             rows={3}
//             onBlur={handleBlur}
//             onChange={props.handleValueChange}
//             value={props.data[currentQuestionIndex].StandardAnswer || ""}
//             style={{ marginBottom: "20px" }}
//           />
//           {props.data[currentQuestionIndex].relevancyMessage !== undefined &&
//             props.data[currentQuestionIndex].relevancyStatus ===
//               "irrelevant" && (
//               <p style={{ color: "orangered", fontStyle: "italic" }}>
//                 <b>Feedback: </b>
//                 {props.data[currentQuestionIndex].relevancyMessage}
//               </p>
//             )}
//           <div>
//             <Button
//               onClick={handlePrevious}
//               disabled={currentQuestionIndex === 0}
//               variant="contained"
//               style={{ marginRight: "10px" }}
//             >
//               Previous
//             </Button>
//             <Button
//               onClick={handleNext}
//               disabled={currentQuestionIndex === props.data.length - 1}
//               variant="contained"
//               style={{ marginRight: "10px" }}
//             >
//               Next
//             </Button>
//           </div>
//         </Paper>
//       </Grid>
//     </Grid>
//   );
// };

// export default ShowQuestions;
