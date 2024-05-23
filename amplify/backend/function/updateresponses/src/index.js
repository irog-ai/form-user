const aws = require("aws-sdk");

exports.handler = async (event) => {
  //console.log(`EVENT: ${JSON.stringify(event)}`);

  //const input = Buffer.from(event.body, "base64").toString("ascii");
  let input= event.body;
  if(!event.body.indexOf("WebKitFormBoundary")>0)
   input = Buffer.from(event.body, "base64").toString("ascii");
  const boundaryRegex = /^--([^\r\n]+)/;
  const boundaryMatch = input.match(boundaryRegex);
  const boundary = boundaryMatch ? boundaryMatch[1] : null;
  const formdata = {};
  if (boundary) {
    // Split the string into separate key-value pairs
    const keyValuePairs = input
      .split(`${boundary}--`)[0]
      .split(`${boundary}\r\n`)
      .slice(1);

    // Extract the data for each key-value pair

    keyValuePairs.forEach((pair) => {
      const match = pair.match(/name="([^"]+)"\r\n\r\n(.+)\r\n/);
      if (match) {
        const name = match[1];
        const value = match[2];
        formdata[name] = value;
      }
    });

    //console.log(formdata);
  }
//   const { Parameters } = await new aws.SSM()
//     .getParameters({
//       Names: ["DB_USERNAME", "DB_PASS"].map(
//         (secretName) => process.env[secretName]
//       ),
//       WithDecryption: true,
//     })
//     .promise();

  const promise = new Promise((resolve, reject) => {
    let sql = require("mssql");

    const config = {
        user: "admin",
        password: "Admin123",
        server: "irog-ai-db.cv62ee6awzrf.us-east-2.rds.amazonaws.com",
        port: 1433,
        options: {
          database: "irog",
          encrypt: false,
        },
      };

    sql.connect(config).then(async (pool) => {
      try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        const tableName = "WebResponses";
        const nameColumnName = "IsActive";
        const idColumnName = "QuestionId";
        const table = new sql.Table("WebResponses");

        table.create = false;
        table.columns.add("CaseId", sql.Int, { nullable: false });
        table.columns.add("QuestionId", sql.Int, { nullable: false });
        table.columns.add("StandardAnswer", sql.NVarChar(sql.MAX), {
          nullable: true,
        });
        table.columns.add("IsActive", sql.Bit, { nullable: true });
        table.columns.add("InsertedTimeStamp", sql.DateTime, {
          nullable: true,
        });
        table.columns.add("Channel", sql.NVarChar, {
          nullable: true,
        });
        let tabledata = JSON.parse(formdata.data);
        //CHANGE THIS BACK
        // const filteredTableData = tabledata.filter(
        //   (row) => row.StandardAnswerWeb !== null
        // );
        const filteredTableData = tabledata.filter((row) => row.IsModified === 1);
        let updatequery = `UPDATE ${tableName} SET ${nameColumnName} = 0`;
        updatequery += ` WHERE ${idColumnName} IN (`;
        updatequery += filteredTableData
          .map((row_1) => `${row_1.Id}`)
          .join(",");
        updatequery += ")";
        console.log(updatequery);

        const currentDate = new Date();

        console.log(filteredTableData);

        filteredTableData.forEach((row_2) => {
          table.rows.add(
            row_2.CaseId,
            row_2.Id,
            row_2.StandardAnswer,
            1,
            currentDate,
            "Web"
          );
        });
        let results;
        console.log(table.rows);
        try {
          const request = new sql.Request(transaction);
          const updateResults = await request.query(updatequery);
          results = await request.bulk(table);
          
          await transaction.commit();
          resolve(results);
          console.log('Transaction committed successfully.');
        } catch (error) {
          await transaction.rollback();
          reject(results);
          console.error('Transaction rolled back due to error:', error);
        } finally {
          pool.close();
        }
      } catch (err_1) {
        console.error(err_1);
        reject(err_1);
      }
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

// const request = new sql.Request();

// // Define the table and column names
// const tableName = "questions";
// const idColumnName = "Id";
// const nameColumnName = "StandardAnswer";
// let tabledata = JSON.parse(formdata.data);
// //const request = new sql.Request();

// // Generate bulk update query
// let query = `UPDATE ${tableName} SET ${nameColumnName} = CASE `;
// let params = [];
// console.log(tabledata.filter((row) => row.StandardAnswerWeb !== null));
// const filteredTableData = tabledata.filter(
//   (row) => row.StandardAnswerWeb !== null
// );

// filteredTableData.forEach((row) => {
//   console.log(row.StandardAnswerWeb);
//   query += `WHEN ${idColumnName} = @id${row.Id} THEN @name${row.Id} `;
//   request.input(`id${row.Id}`, sql.Int, row.Id);
//   request.input(`name${row.Id}`, sql.NVarChar, row.StandardAnswerWeb);
// });
// query += `END WHERE ${idColumnName} IN (`;
// query += filteredTableData.map((row) => `@id${row.Id}`)
//   .join(",");
// query += ")";

// console.log(query);

// // Execute the bulk update query
// const result = request.query(query);

// //console.log(`Rows affected: ${result.rowsAffected}`);
// resolve(result);
// });
