import { google } from "googleapis";
import { APPS_SCRIPT_CODE, APPS_SCRIPT_HTML, APPS_SCRIPT_STYLES, APPS_SCRIPT_JS } from "./appscript-template";

let connectionSettings: any;

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=google-sheet",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Google Sheet not connected");
  }
  return accessToken;
}

export async function getGoogleSheetsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function getAppsScriptClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.script({ version: "v1", auth: oauth2Client });
}

interface Client {
  id: string;
  name: string;
  quartier: string;
  phone: string;
  createdAt: string;
}

interface Order {
  id: string;
  clientId: string;
  clientName: string;
  quantity: number;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  date: string;
  createdAt: string;
}

const SPREADSHEET_NAME = "ZFood - Tableau de Bord Pro";
const MONTHLY_BASKET_GOAL = 120;
const ADMIN_PASSWORD = "ZFOOD";

async function makeSheetPublic(spreadsheetId: string): Promise<void> {
  const drive = await getGoogleDriveClient();

  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (error: any) {
    if (!error.message?.includes("already has access")) {
      console.log(
        "Note: Could not make sheet public, it may already be shared",
      );
    }
  }
}

async function ensureSheetsExist(spreadsheetId: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const existingSheets =
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || [];
  const requiredSheets = [
    "Dashboard",
    "Clients",
    "Commandes",
    "Saisie Manuelle",
  ];
  const missingSheets = requiredSheets.filter(
    (name) => !existingSheets.includes(name),
  );

  if (missingSheets.length > 0) {
    const requests = missingSheets.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

async function findOrCreateSpreadsheet(): Promise<string> {
  const drive = await getGoogleDriveClient();

  const response = await drive.files.list({
    q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    spaces: "drive",
    fields: "files(id, name)",
  });

  if (response.data.files && response.data.files.length > 0) {
    const spreadsheetId = response.data.files[0].id!;
    await ensureSheetsExist(spreadsheetId);
    await makeSheetPublic(spreadsheetId);
    return spreadsheetId;
  }

  const sheets = await getGoogleSheetsClient();
  const newSheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: SPREADSHEET_NAME,
      },
      sheets: [
        {
          properties: {
            title: "Dashboard",
            gridProperties: { frozenRowCount: 0 },
          },
        },
        {
          properties: {
            title: "Clients",
            gridProperties: { frozenRowCount: 2 },
          },
        },
        {
          properties: {
            title: "Commandes",
            gridProperties: { frozenRowCount: 2 },
          },
        },
        {
          properties: {
            title: "Saisie Manuelle",
            gridProperties: { frozenRowCount: 0 },
          },
        },
      ],
    },
  });

  const spreadsheetId = newSheet.data.spreadsheetId!;

  await makeSheetPublic(spreadsheetId);

  return spreadsheetId;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  } catch {
    return "-";
  }
}

function isSameDay(date1: string, date2: string): boolean {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  } catch {
    return false;
  }
}

function getCurrentMonth(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

async function getSheetId(
  spreadsheetId: string,
  sheetName: string,
): Promise<number | null> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName,
  );
  return sheet?.properties?.sheetId ?? null;
}

async function applyFormatting(
  spreadsheetId: string,
  clientCount: number,
  orderCount: number,
): Promise<void> {
  const sheets = await getGoogleSheetsClient();

  const resumeSheetId = await getSheetId(spreadsheetId, "Resume");
  const clientsSheetId = await getSheetId(spreadsheetId, "Clients");
  const commandesSheetId = await getSheetId(spreadsheetId, "Commandes");

  const greenColor = { red: 0.086, green: 0.639, blue: 0.29 };
  const orangeColor = { red: 0.976, green: 0.451, blue: 0.086 };
  const lightGreen = { red: 0.851, green: 0.918, blue: 0.827 };
  const lightOrange = { red: 1, green: 0.929, blue: 0.878 };
  const white = { red: 1, green: 1, blue: 1 };
  const darkGreen = { red: 0.078, green: 0.325, blue: 0.176 };

  const requests: any[] = [];

  if (resumeSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId: resumeSheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: greenColor,
              textFormat: { bold: true, fontSize: 14, foregroundColor: white },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: resumeSheetId, startRowIndex: 2, endRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              backgroundColor: lightGreen,
              textFormat: {
                bold: true,
                fontSize: 11,
                foregroundColor: darkGreen,
              },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: resumeSheetId, startRowIndex: 10, endRowIndex: 11 },
          cell: {
            userEnteredFormat: {
              backgroundColor: orangeColor,
              textFormat: { bold: true, foregroundColor: white },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: resumeSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 280 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: resumeSheetId,
            dimension: "COLUMNS",
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 150 },
          fields: "pixelSize",
        },
      },
    );
  }

  if (clientsSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId: clientsSheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: greenColor,
              textFormat: { bold: true, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: clientsSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 100 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: clientsSheetId,
            dimension: "COLUMNS",
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 150 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: clientsSheetId,
            dimension: "COLUMNS",
            startIndex: 2,
            endIndex: 15,
          },
          properties: { pixelSize: 120 },
          fields: "pixelSize",
        },
      },
    );

    for (let i = 1; i <= clientCount; i++) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: clientsSheetId,
            startRowIndex: i,
            endRowIndex: i + 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: i % 2 === 0 ? lightGreen : white,
            },
          },
          fields: "userEnteredFormat(backgroundColor)",
        },
      });
    }
  }

  if (commandesSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: orangeColor,
              textFormat: { bold: true, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: commandesSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 100 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: commandesSheetId,
            dimension: "COLUMNS",
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 150 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: commandesSheetId,
            dimension: "COLUMNS",
            startIndex: 2,
            endIndex: 9,
          },
          properties: { pixelSize: 120 },
          fields: "pixelSize",
        },
      },
    );

    for (let i = 1; i <= orderCount; i++) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: i,
            endRowIndex: i + 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: i % 2 === 0 ? lightOrange : white,
            },
          },
          fields: "userEnteredFormat(backgroundColor)",
        },
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

async function applyProfessionalFormatting(
  spreadsheetId: string,
  clientCount: number,
  orderCount: number,
): Promise<void> {
  const sheets = await getGoogleSheetsClient();

  const dashboardSheetId = await getSheetId(spreadsheetId, "Dashboard");
  const clientsSheetId = await getSheetId(spreadsheetId, "Clients");
  const commandesSheetId = await getSheetId(spreadsheetId, "Commandes");
  const saisieSheetId = await getSheetId(spreadsheetId, "Saisie Manuelle");

  const greenColor = { red: 0.086, green: 0.639, blue: 0.29 };
  const darkGreen = { red: 0.078, green: 0.325, blue: 0.176 };
  const orangeColor = { red: 0.976, green: 0.451, blue: 0.086 };
  const lightGreen = { red: 0.851, green: 0.918, blue: 0.827 };
  const lightOrange = { red: 1, green: 0.929, blue: 0.878 };
  const white = { red: 1, green: 1, blue: 1 };
  const lightGray = { red: 0.95, green: 0.95, blue: 0.95 };

  const requests: any[] = [];

  // Dashboard formatting
  if (dashboardSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId: dashboardSheetId,
            startRowIndex: 1,
            endRowIndex: 5,
            startColumnIndex: 1,
            endColumnIndex: 7,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: greenColor,
              textFormat: { bold: true, fontSize: 14, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: dashboardSheetId,
            startRowIndex: 6,
            endRowIndex: 7,
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 12,
                foregroundColor: darkGreen,
              },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(textFormat,horizontalAlignment)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: dashboardSheetId,
            startRowIndex: 8,
            endRowIndex: 14,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: lightGreen,
              textFormat: { fontSize: 11 },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: dashboardSheetId,
            startRowIndex: 15,
            endRowIndex: 21,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: lightOrange,
              textFormat: { fontSize: 11 },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: dashboardSheetId,
            startRowIndex: 22,
            endRowIndex: 25,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: orangeColor,
              textFormat: { bold: true, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: dashboardSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 7,
          },
          properties: { pixelSize: 150 },
          fields: "pixelSize",
        },
      },
    );
  }

  // Clients sheet formatting
  if (clientsSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId: clientsSheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: greenColor,
              textFormat: { bold: true, fontSize: 14, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: clientsSheetId, startRowIndex: 1, endRowIndex: 2 },
          cell: {
            userEnteredFormat: {
              backgroundColor: darkGreen,
              textFormat: { bold: true, fontSize: 10, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: clientsSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 50 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: clientsSheetId,
            dimension: "COLUMNS",
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 180 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: clientsSheetId,
            dimension: "COLUMNS",
            startIndex: 2,
            endIndex: 15,
          },
          properties: { pixelSize: 110 },
          fields: "pixelSize",
        },
      },
    );

    for (let i = 2; i <= clientCount + 1; i++) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: clientsSheetId,
            startRowIndex: i,
            endRowIndex: i + 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: i % 2 === 0 ? lightGreen : white,
            },
          },
          fields: "userEnteredFormat(backgroundColor)",
        },
      });
    }
  }

  // Commandes sheet formatting
  if (commandesSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: orangeColor,
              textFormat: { bold: true, fontSize: 14, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: 1,
            endRowIndex: 2,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.8, green: 0.35, blue: 0.05 },
              textFormat: { bold: true, fontSize: 10, foregroundColor: white },
              horizontalAlignment: "CENTER",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: commandesSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 50 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: commandesSheetId,
            dimension: "COLUMNS",
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 180 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: commandesSheetId,
            dimension: "COLUMNS",
            startIndex: 2,
            endIndex: 9,
          },
          properties: { pixelSize: 110 },
          fields: "pixelSize",
        },
      },
    );

    for (let i = 2; i <= orderCount + 1; i++) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: i,
            endRowIndex: i + 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: i % 2 === 0 ? lightOrange : white,
            },
          },
          fields: "userEnteredFormat(backgroundColor)",
        },
      });
    }
  }

  // Saisie Manuelle sheet formatting
  if (saisieSheetId !== null) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId: saisieSheetId, startRowIndex: 0, endRowIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: greenColor,
              textFormat: { bold: true, fontSize: 12, foregroundColor: white },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: saisieSheetId, startRowIndex: 5, endRowIndex: 12 },
          cell: {
            userEnteredFormat: {
              backgroundColor: lightGreen,
            },
          },
          fields: "userEnteredFormat(backgroundColor)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: saisieSheetId, startRowIndex: 13, endRowIndex: 22 },
          cell: {
            userEnteredFormat: {
              backgroundColor: lightOrange,
            },
          },
          fields: "userEnteredFormat(backgroundColor)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: saisieSheetId, startRowIndex: 23, endRowIndex: 30 },
          cell: {
            userEnteredFormat: {
              backgroundColor: lightGray,
              textFormat: { italic: true, fontSize: 10 },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: saisieSheetId,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 600 },
          fields: "pixelSize",
        },
      },
    );
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

export async function syncDataToSheet(
  clients: Client[],
  orders: Order[],
): Promise<{ success: boolean; spreadsheetId: string; message: string }> {
  try {
    const spreadsheetId = await findOrCreateSpreadsheet();
    const sheets = await getGoogleSheetsClient();
    const { start: monthStart, end: monthEnd } = getCurrentMonth();

    const clientStats = clients.map((client) => {
      const clientOrders = orders.filter((o) => o.clientId === client.id);
      const totalOrders = clientOrders.length;
      const totalBaskets = clientOrders.reduce(
        (sum, o) => sum + (o.quantity || 1),
        0,
      );
      const totalAmount = clientOrders.reduce((sum, o) => sum + o.amount, 0);
      const paidOrders = clientOrders.filter((o) => o.isPaid);
      const unpaidOrders = clientOrders.filter((o) => !o.isPaid);
      const paidBaskets = paidOrders.reduce(
        (sum, o) => sum + (o.quantity || 1),
        0,
      );
      const unpaidBaskets = unpaidOrders.reduce(
        (sum, o) => sum + (o.quantity || 1),
        0,
      );
      const paidAmount = paidOrders.reduce((sum, o) => sum + o.amount, 0);
      const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.amount, 0);

      const monthlyOrders = clientOrders.filter((o) => {
        const orderDate = new Date(o.date);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      const monthlyBaskets = monthlyOrders.reduce(
        (sum, o) => sum + (o.quantity || 1),
        0,
      );
      const monthlyGoalReached = monthlyBaskets >= MONTHLY_BASKET_GOAL;
      const monthlyProgress = Math.round(
        (monthlyBaskets / MONTHLY_BASKET_GOAL) * 100,
      );

      return {
        ...client,
        totalOrders,
        totalBaskets,
        totalAmount,
        paidBaskets,
        unpaidBaskets,
        paidAmount,
        unpaidAmount,
        monthlyBaskets,
        monthlyGoalReached,
        monthlyProgress,
      };
    });

    const totalAllOrders = orders.length;
    const totalAllBaskets = orders.reduce(
      (sum, o) => sum + (o.quantity || 1),
      0,
    );
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalPaid = orders
      .filter((o) => o.isPaid)
      .reduce((sum, o) => sum + o.amount, 0);
    const totalUnpaid = orders
      .filter((o) => !o.isPaid)
      .reduce((sum, o) => sum + o.amount, 0);
    const unpaidOrdersCount = orders.filter((o) => !o.isPaid).length;

    // === DASHBOARD SHEET ===
    // 1. On nettoie la feuille
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Dashboard!A1:Z100",
      });
    } catch (e) {}

    // 2. On prépare les données avec des FORMULES
    // Note: On suppose que la feuille Clients a les données en col A et Commandes le montant en col E
    const dashboardData = [
      ["", "", "", "", "", "", ""],
      ["", "ZFOOD ASSISTANCE - TABLEAU DE BORD", "", "", "", "", ""],
      [
        "",
        "Mise à jour du script : " + formatDate(new Date().toISOString()),
        "",
        "",
        "",
        "",
        "",
      ],
      [""],
      // Ligne des titres
      ["", "CLIENTS TOTAL", "", "PANIERS VENDUS", "", "COMMANDES TOTAL", ""],
      // Ligne des VALEURS (On injecte des formules ici !)
      [
        "",
        "=NBVAL(Clients!B3:B)", // Compte les clients dynamiquement
        "",
        "=SOMME(Commandes!D3:D)", // Somme des quantités (Col D)
        "",
        "=NBVAL(Commandes!A3:A)", // Compte les commandes
        "",
      ],
      [""],
      ["", "CHIFFRE D'AFFAIRES", "", "", "IMPAYÉS A RECOUVRER", "", ""],
      [
        "",
        "=SOMME(Commandes!E3:E)", // Somme des montants (Col E)
        "",
        "",
        '=SOMME.SI(Commandes!F3:F; "IMPAYE"; Commandes!E3:E)', // Somme si statut = IMPAYE
        "",
        "",
      ],
      [""],
      [
        "",
        "",
        "",
        "OBJECTIF MENSUEL (" + MONTHLY_BASKET_GOAL + ")",
        "",
        "",
        "",
      ],
      // Barre de progression visuelle (SPARKLINE)
      [
        "",
        "",
        "",
        `=SPARKLINE(SOMME.SI.ENS(Commandes!D3:D; Commandes!G3:G; ">="&DATE(ANNEE(AUJOURDHUI());MOIS(AUJOURDHUI());1); Commandes!G3:G; "<="&FIN.MOIS(AUJOURDHUI();0)); {"charttype"\\"bar";"max"\\${MONTHLY_BASKET_GOAL};"color1"\\"#46bdc6"})`,
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        // Texte de progression dynamique
        `="Actuel: " & SOMME.SI.ENS(Commandes!D3:D; Commandes!G3:G; ">="&DATE(ANNEE(AUJOURDHUI());MOIS(AUJOURDHUI());1); Commandes!G3:G; "<="&FIN.MOIS(AUJOURDHUI();0)) & " paniers"`,
        "",
        "",
        "",
      ],
      [""],
      ["", "ACCES WEBAPP SUPER-ADMIN", "", "", "", "", ""],
      [
        "",
        `=HYPERLINK("https://${process.env.REPLIT_DEV_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN || "votre-app.replit.app"}:5000/webapp"; "Cliquez ici pour ouvrir la WebApp")`,
        "",
        "",
        "",
        "",
        "",
      ],
      [""],
      ["", "NOTE IMPORTANTE:", "", "", "", "", ""],
      [
        "",
        "Les données ci-dessus se mettent à jour automatiquement",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        'dès que vous modifiez les onglets "Clients" ou "Commandes".',
        "",
        "",
        "",
        "",
        "",
      ],
    ];

    // 3. IMPORTANT : Changer valueInputOption en 'USER_ENTERED'
    // C'est ce qui permet à Google Sheets d'interpréter le "=" comme une formule
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Dashboard!A1",
      valueInputOption: "USER_ENTERED", // <--- C'est la clé du changement !
      requestBody: { values: dashboardData },
    });

    // === CLIENTS SHEET ===
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Clients!A1:Z1000",
      });
    } catch (e) {}

    const clientTitle = [
      [
        "LISTE DES CLIENTS ZFOOD",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ];
    const clientHeaders = [
      "N°",
      "NOM CLIENT",
      "QUARTIER",
      "TELEPHONE",
      "INSCRIPTION",
      "COMMANDES",
      "PANIERS",
      "TOTAL (FCFA)",
      "PAYES",
      "IMPAYES",
      "MONTANT PAYE",
      "MONTANT DU",
      "CE MOIS",
      "OBJECTIF",
      "PROGRESSION",
    ];

    const clientRows = clientStats.map((c, i) => [
      i + 1,
      c.name.toUpperCase(),
      c.quartier,
      c.phone,
      formatDate(c.createdAt),
      c.totalOrders,
      c.totalBaskets,
      c.totalAmount,
      c.paidBaskets,
      c.unpaidBaskets,
      c.paidAmount,
      c.unpaidAmount,
      c.monthlyBaskets,
      c.monthlyGoalReached ? "ATTEINT" : "EN COURS",
      c.monthlyProgress + "%",
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Clients!A1",
      valueInputOption: "RAW",
      requestBody: { values: [clientTitle[0], clientHeaders, ...clientRows] },
    });

    // === COMMANDES SHEET ===
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Commandes!A1:Z1000",
      });
    } catch (e) {}

    const orderTitle = [
      ["HISTORIQUE DES COMMANDES ZFOOD", "", "", "", "", "", "", "", ""],
    ];
    const orderHeaders = [
      "N°",
      "CLIENT",
      "QUARTIER",
      "PANIERS",
      "MONTANT (FCFA)",
      "STATUT",
      "DATE CMD",
      "DATE PAIEMENT",
      "MEME JOUR",
    ];

    const orderRows = orders.map((o, i) => {
      const client = clients.find((c) => c.id === o.clientId);
      const orderDate = o.date || o.createdAt;
      const paymentDate = o.isPaid ? o.paidAt || o.date : "";
      const paidSameDay = o.isPaid && isSameDay(orderDate, o.paidAt || o.date);

      return [
        i + 1,
        o.clientName.toUpperCase(),
        client?.quartier || "-",
        o.quantity || 1,
        o.amount,
        o.isPaid ? "PAYE" : "IMPAYE",
        formatDate(orderDate),
        o.isPaid ? formatDate(paymentDate) : "En attente",
        o.isPaid ? (paidSameDay ? "OUI" : "NON") : "-",
      ];
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Commandes!A1",
      valueInputOption: "RAW",
      requestBody: { values: [orderTitle[0], orderHeaders, ...orderRows] },
    });

    // === SAISIE MANUELLE SHEET ===
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Saisie Manuelle!A1:Z100",
      });
    } catch (e) {}

    const saisieData = [
      [
        "╔════════════════════════════════════════════════════════════════════════════════════════╗",
      ],
      [
        "║                           SAISIE MANUELLE - ZFOOD                                      ║",
      ],
      [
        "║                     Mot de passe requis: " +
          ADMIN_PASSWORD +
          "                                         ║",
      ],
      [
        "╚════════════════════════════════════════════════════════════════════════════════════════╝",
      ],
      [""],
      [
        "┌─────────────────────────────────────────────────────────────────────────────────────────┐",
      ],
      [
        "│ AJOUTER UN NOUVEAU CLIENT                                                               │",
      ],
      [
        "├─────────────────────────────────────────────────────────────────────────────────────────┤",
      ],
      ["│ Nom du client:", "", "", "", "│"],
      ["│ Quartier:", "", "", "", "│"],
      ["│ Telephone:", "", "", "", "│"],
      [
        "└─────────────────────────────────────────────────────────────────────────────────────────┘",
      ],
      [""],
      [
        "┌─────────────────────────────────────────────────────────────────────────────────────────┐",
      ],
      [
        "│ AJOUTER UNE NOUVELLE COMMANDE                                                           │",
      ],
      [
        "├─────────────────────────────────────────────────────────────────────────────────────────┤",
      ],
      ["│ Nom du client:", "", "", "", "│"],
      ["│ Nombre de paniers:", "", "", "", "│"],
      ["│ Montant (FCFA):", "", "", "", "│"],
      ["│ Date:", "", "", "", "│"],
      ["│ Statut (Paye/Impaye):", "", "", "", "│"],
      [
        "└─────────────────────────────────────────────────────────────────────────────────────────┘",
      ],
      [""],
      [
        "─────────────────────────────────────────────────────────────────────────────────────────",
      ],
      ["INSTRUCTIONS:"],
      [
        "1. Remplissez les champs ci-dessus pour ajouter des donnees manuellement",
      ],
      [
        "2. Ces donnees seront ecrasees lors de la prochaine synchronisation depuis l'app",
      ],
      [
        "3. Pour des modifications permanentes, utilisez l'application mobile ZFood",
      ],
      ["4. Contactez l'admin pour le mot de passe de modification"],
      [
        "─────────────────────────────────────────────────────────────────────────────────────────",
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Saisie Manuelle!A1",
      valueInputOption: "RAW",
      requestBody: { values: saisieData },
    });

    await applyProfessionalFormatting(
      spreadsheetId,
      clients.length,
      orders.length,
    );

    return {
      success: true,
      spreadsheetId,
      message: `Synchronisation reussie: ${clients.length} clients et ${orders.length} commandes. Interface professionnelle creee!`,
    };
  } catch (error: any) {
    console.error("Error syncing to Google Sheets:", error);
    throw new Error(error.message || "Erreur lors de la synchronisation");
  }
}
