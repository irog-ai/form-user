import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Checkbox from "@mui/material/Checkbox";
import DialogActions from "@mui/material/DialogActions";
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
    const path = "/phonenumbercheck";
    const caseId = key.split("-")[0];
    let record;
    //setState({ ...state, isLoading: true });
    async function getPhonenumber() {
      let response;
      await API.get(myAPI, path + "/" + caseId, {
        headers: {
          "Content-Type": "text/plain",
        },
      })
        .then(async (res) => {
          //console.log(response);
          response = await res;
        })
        .catch(() => {
          setState({ ...state, showNocaseMessage: true });
        });
      if (response.recordset.length === 0) {
        setState({
          ...state,
          showNocaseMessage: true,
          isLoading: false,
          noCaseMessage: `Apologies, but we have no current records for this case on our end. 
          Please open the link from the email your attorney sent. 
          If you're still experiencing issues, please contact your attorney for further assistance.`,
        });
      } else if (
        response.recordset[0].Status === myConstClass.STATUS_AWAITING
      ) {
        record = response.recordset[0];
        console.log(record);
        console.log(record.PhoneNumber);
        setState({
          ...state,
          casePhonenumber: record.PhoneNumber,
          isLoading: false,
          showDialog: true,
        });
      } else {
        setState({
          ...state,
          showNocaseMessage: true,
          isLoading: false,
          noCaseMessage: `Currently, no action is needed from your side. 
          Please wait for an email regarding any further steps, if required. 
          If you need any additional details, please contact your attorney.`,
        });
      }
    }

    getPhonenumber();
  }, []);

  const relevancyCheck = async (answer, question, index) => {
    let relevant = true;
    let expalnation = "";
    const path = "/checkrelevancy";
    const formData = new FormData();
    formData.append("question", question);
    formData.append("answer", answer);
    await API.post(myAPI, path, {
      body: formData,
    }).then((response) => {
      console.log(response);
      if (Number(response.score) < 70) relevant = false;
      expalnation = response.explanation;
    });
    let temptabledata = [...state.tableData];
    const item = temptabledata.find((item) => item.Id === index);
    if (item) {
      item.relevancyStatus = relevant ? "relevant" : "irrelevant";
      item.relevancyMessage = expalnation;
    }
    if (relevant) {
      const globalRelevancyFlag = !state.tableData.some(
        (item) => item.relevancyStatus === "irrelevant"
      );
      console.log("***" + globalRelevancyFlag);
      setState({
        ...state,
        globalrelevancyflag: globalRelevancyFlag,
        tableData: temptabledata,
      });
    } else {
      setState({
        ...state,
        globalrelevancyflag: false,
        tableData: temptabledata,
      });
    }
    return relevant;
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
    const path = "/getQuestionsform";
    console.log(state.casePhonenumber + "..." + state.phoneNumber);
    if (state.casePhonenumber.toString() !== state.phoneNumber.toString()) {
      setState({ ...state, phoneNumberVerified: false });
    } else {
      let tableData;
      setState({ ...state, isLoading: true });
      await API.get(myAPI, path + "/" + key.split("-")[0], {
        headers: {
          "Content-Type": "text/plain",
        },
      }).then(async (response) => {
        console.log(response);
        tableData = await response.recordset;
        tableData = tableData.map((item) => ({
          ...item, 
          isModified: false, // Adding this new properrty for tracking already answered and saved questions
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

  const handleValueChange = (e) => {
    const updatedQuestions = state.tableData.map((question) => {
      if (question.Id.toString() === e.target.name.toString()) {
        return { ...question, StandardAnswer: e.target.value, isModified: true };
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
    setState({ ...state, isLoading: true });
    const path = "/updateresponses";
    const path2 = "/chatgptresponses";
    const formData = new FormData();
    formData.append("data", JSON.stringify(state.tableData));
    await API.post(myAPI, path, {
      //   headers: {
      //     "content-type": "multipart/form-data",
      //   },
      body: formData,
    }).then(async (response) => {
      await response;
      API.get(myAPI, path2 + "/" + key.split("-")[0]);
    });
    const emptyStandardAnswerCount = state.tableData.filter(
      (item) => item.StandardAnswer === null || item.StandardAnswer === ""
    ).length;
    console.log();
    setState({
      ...state,
      isLoading: false,
      changesMade: false,
      showThankyouMessage: true,
      emptyStandardAnswerCount: emptyStandardAnswerCount,
    });
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
