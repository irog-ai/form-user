/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["DB_USERNAME","DB_PASS","key"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const axios = require("axios");
const aws = require("aws-sdk");

exports.handler = async (event) => {
  //const isQuestion = true;
  console.log(event.pathParameters.id);
  const caseId = event.pathParameters.id;
  let questions = [];
  const { Parameters } = await new aws.SSM()
    .getParameters({
      Names: ["key"].map(
        (secretName) => process.env[secretName]
      ),
      WithDecryption: true,
    })
    .promise();

  //console.log(DbParameters);

  let promise = new Promise((resolve, reject) => {
    let sql = require("mssql");

    const config = {
        user: "admin",
        password: "Admin123",
        server: "irog-db.cv62ee6awzrf.us-east-2.rds.amazonaws.com",
        port: 1433,
        options: {
          database: "irog",
          encrypt: false,
        },
      };

    sql.connect(config, (err) => {
      if (err) {
        reject(err);
      } else {
        const request = new sql.Request();
        request.input("caseId", sql.NVarChar, caseId);

        const selectQuery = `select res.Id, res.CaseId,res.QuestionId,res.StandardAnswer,res.IsActive,res.HaspiiInfo 
        from webresponses res where res.CaseId=@caseId and res.OriginalAnswer is null and 
        res.StandardAnswer is not null`;
        request.query(selectQuery, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  });

  // const { Parameters } = await new aws.SSM()
  //   .getParameters({
  //     Names: ["key"].map((secretName) => process.env[secretName]),
  //     WithDecryption: true,
  //   })
  //   .promise();

  //console.log(`EVENT: ${JSON.stringify(event)}`);
  let resp = "";
  try {
    const res = await promise;
    questions = res.recordset;
    //CHECK PII INFO FOR RESPONSES
    console.log(questions);
    let regex = "";
    let patterns = [/^(?!(000|666|9))\d{3}-(?!00)\d{2}-(?!0000)\d{4}$/, /123/];
    questions.forEach((item) => {
      let PII = "";
      let arr = item.StandardAnswer.split(" ");
      for (let i = 0; i < arr.length; i++) {
        let temp = arr[i];
        for (let j = 0; j < patterns.length; j++) {
          regex = patterns[j];
          if (regex.test(temp) === true) {
            PII = PII + "," + temp;
          }
        }
      }
      console.log(PII);
      if (PII.length > 0) {
        item.HaspiiInfo = 1;
        item.OriginalAnswer = item.StandardAnswer;
        item.PiiInfo = PII;
      }
    });
    console.log(questions);
    let filteredQuestions = questions.filter(
      (row) => row.HaspiiInfo !== 1
    );
    console.log(filteredQuestions);
    //console.log(result.recordset);
    await Promise.all(
      filteredQuestions.map(async (element) => {
        //console.log(element.OriginalQuestion)
        const chatgptPrompt =
          process.env.CHATGPT_PROMPT_ANSWER + ":" + element.StandardAnswer;
        // (isQuestion
        //   ? process.env.CHATGPT_PROMPT
        //   : process.env.CHATGPT_PROMPT_ANSWER) +":"+ element.OriginalQuestion;
        const res = await axios.post(
          `https://api.openai.com/v1/chat/completions`,
          {
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: chatgptPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + Parameters[0].Value,
            },
          }
        );
        console.log(res);
        element.OriginalAnswer = res.data.choices[0].message.content;
        console.log(element.OriginalAnswer);
      })
    );

    //console.log(result);
    //console.log(resp.data.choices[0].message.content);

    //return resp.data.choices[0].text;
    // return {
    //   statusCode: 200,
    //   //Uncomment below to enable CORS requests
    //   headers: {
    //     "Access-Control-Allow-Origin": "*",
    //     "Access-Control-Allow-Headers": "*",
    //   },
    //   body: JSON.stringify(result),
    // };
  } catch (error) {
    console.error("Error making chatgpt call", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: error.message,
    };
  }

  promise = new Promise((resolve, reject) => {
    let sql = require("mssql");

    const config = {
        user: "admin",
        password: "Admin123",
        server: "irog-db.cv62ee6awzrf.us-east-2.rds.amazonaws.com",
        port: 1433,
        options: {
          database: "irog",
          encrypt: false,
        },
      };

    sql.connect(config).then((pool) => {
      const request = new sql.Request();

      // Define the table and column names
      const tableName = "WebResponses";
      const idColumnName = "Id";
      const nameColumnName = "OriginalAnswer";
      const piiColumnName = "HaspiiInfo"
      const piiTextColumnName = "PiiInfo"
      //let tabledata = questions.recordset;
      //const request = new sql.Request();

      // Generate bulk update query
      let query = `UPDATE ${tableName} SET ${nameColumnName} = CASE `;
      let params = [];
      
      questions.forEach((row) => {
        //console.log(row.StandardQuestion);
        query += `WHEN ${idColumnName} = @id${row.Id} THEN @name${row.Id} `;
        request.input(`id${row.Id}`, sql.Int, row.Id);
        request.input(`name${row.Id}`, sql.NVarChar, row.OriginalAnswer);
        request.input(`Haspii${row.Id}`, sql.Bit, row.HaspiiInfo);
        request.input(`piitext${row.Id}`, sql.NVarChar, row.PiiInfo);
      });

      query += `END, ${piiColumnName} = CASE `;
      questions.forEach((row) => {
        query += `WHEN ${idColumnName} = @id${row.Id} THEN @Haspii${row.Id} `;
      });

      query += `END, ${piiTextColumnName} = CASE `;
      questions.forEach((row) => {
        query += `WHEN ${idColumnName} = @id${row.Id} THEN @piitext${row.Id} `;
      });

      query += `END WHERE ${idColumnName} IN (`;
      query += questions.map((row) => `@id${row.Id}`).join(",");
      query += ")";

      console.log(query);

      // Execute the bulk update query
      const result = request.query(query);

      //console.log(`Rows affected: ${result.rowsAffected}`);
      resolve(result);
    });
  });

  try {
    const result = await promise;
    console.log("Step-1");
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(result),
    };
    return response;
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(e),
    };
  }
};
