import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Checkbox from "@mui/material/Checkbox";
import DialogActions from "@mui/material/DialogActions";
import axios from "axios";
import { API } from "aws-amplify";
import {
  Button,
  TextField,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Box,
  Slide,
} from "@mui/material";
import ShowQuestions from "./ShowQuestions";
import Loading from "./ReusableComponents/Loading";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import "./App.css";
import * as myConstClass from "./Util/Constants";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});
const apipath = process.env.REACT_APP_API_URL;

const Submit = (props) => {
  const { key } = useParams();
  console.log(key);

  const myAPI = "api";

  let initialState = {
    showDialog: false,
    phoneNumber: "",
    casePhonenumber: "",
    phoneNumberVerified: true,
    tableData: [],
    isLoading: true,
    changesMade: false,
    showThankyouMessage: false,
    consentChecked: false,
    globalrelevancyflag: true,
    showNocaseMessage: false,
    emptyStandardAnswerCount: 0,
    statusChangedMessage:""
  };
  const [state, setState] = useState(initialState);

  let consentText = (
    <Typography variant="body2" display="block" gutterBottom>
      By submitting this form, I confirm that all the answers provided above are
      accurate and true to the best of my knowledge. I understand that any false
      or misleading information may have legal consequences. I consent to the
      collection and processing of my answers for the purpose of assisting the
      attorney in collecting information based on this questionnaire.
    </Typography>
  );

  useEffect(() => {
    const caseId = key.split("-")[0];
    const apiFunctionPath = `userform/getCaseById/${caseId}`;

    let record;
    async function getPhonenumber() {
      let response;
      await axios
        .get(apipath + apiFunctionPath)
        .then(async (res) => {
          response = res;
        })
        .catch((error) => {
          console.log(error);
          setState({ ...state, showNocaseMessage: true, isLoading: false });
        });
      if (response.data.length === 0) {
        setState({
          ...state,
          caseId: caseId,
          showNocaseMessage: true,
          isLoading: false,
          noCaseMessage: `Apologies, but we have no current records for this case on our end. 
          Please open the link from the email your attorney sent. 
          If you're still experiencing issues, please contact your attorney for further assistance.`,
        });
      } else if (response.data.Status === myConstClass.STATUS_AWAITING) {
        record = response.data;
        console.log(record);
        console.log(record.PhoneNumber);
        setState({
          ...state,
          caseId: caseId,
          casePhonenumber: record.PhoneNumber,
          isLoading: false,
          showDialog: true,
        });
      } else {
        setState({
          ...state,
          showNocaseMessage: true,
          caseId: caseId,
          isLoading: false,
          noCaseMessage: `Currently, no action is needed from your side. 
          Please wait for an email regarding any further steps, if required. 
          If you need any additional details, please contact your attorney.`,
        });
      }
    }

    getPhonenumber();
  }, []);

  const relevancyCheck = async (answer, question, index, subQuestionIndex) => {
    try {
      const path = `userform/evaluateAnswer/${state.caseId}`;
      const requestBody = {
        question: question,
        answer: answer,
      };
      console.log(requestBody);

      const response = await axios.post(`${apipath}${path}`, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response);
      const chatgptResponse = response.data;
      let relevant = true;
      let explanation = "";
      let relevantScoreThreshold = 90;

      if (chatgptResponse.score < relevantScoreThreshold) {
        relevant = false;
        explanation = chatgptResponse.explanation;
      }

      // Update state
      let updatedTableData = [...state.tableData];
      const item = updatedTableData.find((item) => item.Id === index);
      if (item) {
        item.IsModified = 1;
        item.relevancyStatus = relevant ? "relevant" : "irrelevant";
        item.relevancyMessage = explanation;
        const subItem = item.subQuestions.find((subQues)=>subQues.Id===subQuestionIndex);
        subItem.relevancyStatus = relevant ? "relevant" : "irrelevant";
        subItem.relevancyMessage = explanation;
      }

      const globalRelevancyFlag = !updatedTableData.some(
        (item) => item.relevancyStatus === "irrelevant"
      );

      setState({
        ...state,
        globalrelevancyflag: globalRelevancyFlag,
        tableData: updatedTableData,
      });
      console.log(state.tableData);
      return relevant;
    } catch (error) {
      console.error("Error during relevancy check:", error.message);

      // Optionally, update state to handle errors
      setState((prevState) => ({
        ...prevState,
        errorMessage:
          "There was a problem evaluating relevancy. Please try again.",
      }));

      return false;
    }
  };

  const scrollRef = useRef(null);
  const handleScrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleChange = (e) => {
    let newState = { ...state };
    newState[e.target.name] = e.target.value;
    setState(newState);
  };

  const checkPhoneNumber = async () => {
    const path = `userform/getQuestionsWithResponses/${key.split("-")[0]}`;
    console.log(state.casePhonenumber + "..." + state.phoneNumber);
    if (state.casePhonenumber.toString() !== state.phoneNumber.toString()) {
      setState({ ...state, phoneNumberVerified: false });
    } else {
      let tableData;
      setState({ ...state, isLoading: true });
      // await API.get(myAPI, path + "/" + key.split("-")[0], {
      //   headers: {
      //     "Content-Type": "text/plain",
      //   },
      // })
      await axios.get(`${apipath}${path}`).then(async (response) => {
        console.log(response);
        tableData = await response.data;
        tableData = tableData.map((item) => ({
          ...item,
          IsModified: 0, // Adding this new properrty for tracking already answered and saved questions
          subQuestions: item.subQuestions.map(subQues=>({
            ...subQues,
            IsModified: 0
          }))
        }));
        //tableData.forEach(item => item.relevancyStatus = true);
        console.log(tableData);
        //await updateChatGptQuestions(tableData);
      });
      setState({
        ...state,
        tableData: tableData,
        showDialog: false,
        phoneNumberVerified: true,
        isLoading: false,
      });
    }
  };

  const updateChatGptQuestions = async (tableData) => {
    const path = "/Chatgptcall";
    tableData.forEach(async (element) => {
      console.log(element.OriginalQuestion);
      //await new Promise((resolve) => setTimeout(resolve, index * 1000));
      const response = await API.get(
        myAPI,
        path + "/" + element.OriginalQuestion
      );
      console.log(response.recordset[0]);
      element.StandardQuestion = response.recordset[0];
    });
    setState({
      ...state,
      tableData: tableData,
      showDialog: false,
      phoneNumberVerified: true,
      isLoading: false,
    });
  };

  // const handleValueChange = (e) => {
  //   let name = e.target.name.split('-');
  //   const questionIndex = name[0];
  //   const subQuestionIndex = name[1];
  //   const updatedQuestions = state.tableData.map((question) => {
  //     if (question.Id.toString() === questionIndex) {
  //       return { ...question, StandardAnswer: e.target.value, IsModified: 1 };
  //     }
  //     return question;
  //   });
  //   setState({ ...state, tableData: updatedQuestions, changesMade: true });
  // };
  const handleValueChange = (e) => {
    // Split the name to get indexes for question and sub-question
    
    let name = e.target.name.split('-');
    console.log(name);
    const questionIndex = parseInt(name[0], 10); // Parse strings to integers
    const subQuestionIndex = parseInt(name[1], 10);
  
    const updatedQuestions = state.tableData.map((question, qIndex) => {
      if (question.Id === questionIndex) {
        question.IsModified = 1;
        // Map over subQuestions to update the specific sub-question
        const updatedSubQuestions = question.subQuestions.map((subQuestion, sqIndex) => {
          if (subQuestion.Id === subQuestionIndex) {
            return {
              ...subQuestion,
              UserResponse: e.target.value, // Update UserResponse field
              IsModified: 1
            };
          }
          return subQuestion;
        });
  
        return { ...question, subQuestions: updatedSubQuestions };
      }
      return question;
    });
  
    setState({ ...state, tableData: updatedQuestions, changesMade: true });
  };
  

  const handleCheckBoxChange = () => {
    let value = !state.consentChecked;
    setState({ ...state, consentChecked: value });
  };


  const onSubmit = async () => {
    try {
      // Set loading state
      setState((prevState) => ({ ...prevState, isLoading: true }));
      const caseId = key.split("-")[0];
      // Post the table data to the server
      const res = await axios.post(
        `${apipath}responses/updateSubResponses/${caseId}`,
        state.tableData
      );
      console.log(res);
      console.log("----------"+res.data);
      console.log("----------"+res.data.message);
      if (res.data.message === "Responses updated successfully" || res.data.message === "Sub-Responses updated successfully") {        
        
        // Get the processed responses for the provided caseId
        await axios.get(`${apipath}responses/chatgptresponses/${caseId}`);

        const emptyStandardAnswerCount = state.tableData.filter(
          (item) => item.subQuestions.some(sq => !sq.UserResponse || sq.UserResponse.trim() === "")
        ).length;

        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          changesMade: false,
          showThankyouMessage: true,
          emptyStandardAnswerCount: emptyStandardAnswerCount,
        }));
      } else if(res.data.message.includes("Status is changed already") ) {
        let status = res.data.message.split('-')[1];
        if(status.includes("CANCEL")) status="Cancelled";
        else status="Completed";
        let message = `Case is already marked as ${status}. Please contact your attorney if you need any further classification.`;
        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          changesMade: false,
          statusChangedMessage: message,
        }));
      }
    } catch (error) {
      console.error("Error during submission and processing:", error);
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        errorMessage: "An error occurred. Please try again.",
      }));
    }
  };

  const handleClose = () => {
    setState({
      ...state,
      showDialog: false,
    });
  };

  return !state.isLoading ? (
    <div>
      <Dialog
        open={state.showDialog}
        TransitionComponent={Transition}
        //onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{"Validation"}</DialogTitle>

        <DialogContent>
          {!state.phoneNumberVerified && (
            <React.Fragment>
              <DialogContentText id="alert-dialog-slide-description">
                Sorry, validation against the phone number entered failed.
                Please try again!!!!
              </DialogContentText>
            </React.Fragment>
          )}
          {state.phoneNumberVerified && (
            <React.Fragment>
              <DialogContentText id="alert-dialog-slide-description">
                Please enter your 10 digit phone number associated with the case
                for validation
              </DialogContentText>
            </React.Fragment>
          )}
          <React.Fragment>
            <TextField
              id="phoneNumber"
              name="phoneNumber"
              label="Phone Number"
              variant="outlined"
              onChange={handleChange}
              value={state.phoneNumber}
              style={{ width: "80%", marginTop: "10px" }}
            />
          </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={checkPhoneNumber}
            disabled={state.phoneNumber.length !== 10}
            style={{ marginLeft: "10px", marginTop: "20px" }}
          >
            Validate
          </Button>
        </DialogActions>
      </Dialog>

      {state.tableData != undefined &&
        state.tableData.length > 0 &&
        !state.showThankyouMessage &&
        !state.statusChangedMessage &&
        !state.showNocaseMessage && (
          <div
            style={{ marginLeft: "3%", marginRight: "3%" }}
            className="scroll-to-bottom-container"
          >
            <div ref={scrollRef} />
            {/* <button
              onClick={handleScrollToBottom}
              className="button-with-arrow"
            ></button> */}
            <Typography
              variant="h5"
              style={{ color: "rgb(0, 0, 0)", marginTop: "30px" }}
              gutterBottom
            >
              Client Interrogatories
            </Typography>
            <Typography variant="overline" display="block" gutterBottom>
              {key.substring(key.indexOf("-") + 1)}
            </Typography>
            <ShowQuestions
              data={state.tableData}
              handleValueChange={handleValueChange}
              relevancyCheck={relevancyCheck}
            />

            <FormControlLabel
              value="top"
              control={<Checkbox />}
              onChange={handleCheckBoxChange}
              checked={state.consentChecked}
              label={consentText}
              labelPlacement="end"
              disabled={!state.changesMade}
            />
            {!state.globalrelevancyflag && (
              <p style={{ color: "red", margin: "5px" }}>
                Some responses appear to be irrelevant. Kindly ensure that all
                entries are appropriate before proceeding with the submission.{" "}
              </p>
            )}
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={
                !state.changesMade ||
                !state.consentChecked ||
                !state.globalrelevancyflag
              }
              style={{ marginTop: "10px", marginBottom: "20px" }}
            >
              Submit responses
            </Button>
          </div>
        )}
      {state.showNocaseMessage && (
        <React.Fragment>
          <p className="Message-box">{state.noCaseMessage}</p>
        </React.Fragment>
      )}
      {state.statusChangedMessage!=="" && (
        <Typography variant="h6" gutterBottom align="center">
          <p className="Message-box">{state.statusChangedMessage}</p>
          
        </Typography>
      )}
      {state.showThankyouMessage && (
        <React.Fragment>
          <Typography variant="h6" gutterBottom align="center">
            {state.emptyStandardAnswerCount > 0 && (
              <p className="Message-box">
                Thank you for your responses. There is still{" "}
                {state.emptyStandardAnswerCount === 1
                  ? "1 question"
                  : `${state.emptyStandardAnswerCount} questions`}{" "}
                that require your attention. Please submit your answers at your
                earliest convenience
              </p>
            )}
            {state.emptyStandardAnswerCount === 0 && (
              <p className="Message-box">
                All your responses have been duly recorded. Your attorney will
                reach out to you if further information is needed. If you have
                any questions or need additional assistance, please don't
                hesitate to contact your attorney."
              </p>
            )}
          </Typography>
        </React.Fragment>
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default Submit;
