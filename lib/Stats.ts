import {google} from  'googleapis';
import { bot } from './main';
import { promisify } from 'util';
const OAuth2 = google.auth.OAuth2;
const sheets = google.sheets('v4');

export class Stats {
  private static stats: Map<string, number> = new Map();

  static track(key: string){
    this.stats.set(key, (this.stats.get(key) || 0) + 1)
  }

  static print(){
    console.log(`=================== Statistics ===================`);
    console.log('');
    
    [... this.stats.entries()].forEach(([key, val]) => {
      console.log(`${key}: ${val}`);
    });
    
    console.log('');
  }

  static async saveToGoogleSheets(){
    const oauth2Client = new OAuth2(
      await bot.config().get('googleauth/client_secret'),
      await bot.config().get('googleauth/client_key'),
      await bot.config().get('googleauth/redirect_url')
    );

    oauth2Client.setCredentials({
      access_token: await bot.config().get('googleauth/access_token'),
      refresh_token: await bot.config().get('googleauth/refresh_token')
    });

    const values = [
      new Date().getTime()      
    ]

    let maxRow = 0;

    for(let [key, row] of Object.entries(await bot.config().get("stats/key_to_row"))){
      if(maxRow < row){
        for(let i = 0; i < maxRow - row; i++){
          values.push();
        }
        maxRow = row;
      }

      values[row] = this.stats.get(key) || 0;
    }

    return promisify(sheets.spreadsheets.values.append)({
      "spreadsheetId": await bot.config().get('stats/spreadsheet_id'),
      "range": `A:${String.fromCharCode(65 + maxRow)}`,
      "includeValuesInResponse": "false",
      "insertDataOption": "INSERT_ROWS",
      "responseDateTimeRenderOption": "FORMATTED_STRING",
      "responseValueRenderOption": "FORMATTED_VALUE",
      "valueInputOption": "USER_ENTERED",
      "resource": {
        "values": [
          values
        ]
      },
      auth: oauth2Client
    })

  }
}

/*
import * as readline from 'readline';

function getNewToken(oauth2Client) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets']
  });

  console.log('Authorize this app by visiting this url:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Enter the code from that page here: ', code => {
      rl.close();

      resolve(oauth2Client.getToken(code).then(({ tokens }) => {
        console.log(tokens)
        oauth2Client.credentials = tokens;

        return oauth2Client;
      }).catch(err => console.log('Error while trying to retrieve access token', err)));
    });
  });
}
*/