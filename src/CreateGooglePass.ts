import { GoogleAuthOptions } from "google-auth-library";
import { PassPayload } from "./types/CreatePassPayload";
import { BarcodeTypeEnum, GenericClient, TextModuleData } from "./Generic";
import { SchufaLlcClass } from "./utils/SchufaLLC";
import { BonifyFinFitness, BonifyLLC, SchufaBasisScore } from "./utils";
const jwt = require("jsonwebtoken");

export const createGooglePass = async (
  payload: PassPayload,
  credentials: GoogleAuthOptions["credentials"],
  ISSUER_ID: string,
  private_key: string,
  client_email: string
) => {
  try {
    let generic = new GenericClient(credentials);
    let genericClass = await generic.getClass(ISSUER_ID, payload.type);

    if (!genericClass) {
      // if class doesn't exist
      if (payload?.type === "schufaLLC") {
        // creating new schufaLLC class
        let classObject = SchufaLlcClass;
        (classObject.id = `${ISSUER_ID}.schufaLLC`),
          (genericClass = await generic.createClass(classObject));
        console.log("Class Inserted Successfully");
      } else if (payload?.type === "bonifyFinFitness") {
        let classObject = BonifyFinFitness;
        (classObject.id = `${ISSUER_ID}.bonifyFinFitness`),
          (genericClass = await generic.createClass(classObject));
        console.log("Class Inserted Successfully");
      } else if (payload?.type === "schufaBasisScore") {
        let classObject = SchufaBasisScore;
        (classObject.id = `${ISSUER_ID}.schufaBasisScore`),
          (genericClass = await generic.createClass(classObject));
        console.log("Class Inserted Successfully");
      } else if (payload?.type === "bonifyLLC") {
        let classObject = BonifyLLC;
        (classObject.id = `${ISSUER_ID}.bonifyLLC`),
          (genericClass = await generic.createClass(classObject));
        console.log("Class Inserted Successfully");
      } else {
        throw "Class is not generated";
      }
    }

    let objectSuffix = `${payload.id.replace(/[^\w.-]/g, "_")}`;

    let objectId = `${ISSUER_ID}.${objectSuffix}`;
    let classId = `${ISSUER_ID}.${payload.type}`;

    let genericObject = await generic.getObject(ISSUER_ID, objectSuffix);

    if (!genericObject) {
      // if object doesn't exist
      let rows = payload.rows.map((row, index) => {
        let array: TextModuleData[] = [];
        if (row.left_label && row.left_value) {
          array.push({
            id: `row${index + 1}-left`,
            header: row.left_label,
            body: row.left_value,
          });
        }
        if (row.middle_label && row.middle_value) {
          array.push({
            id: `row${index + 1}-mid`,
            header: row.middle_label,
            body: row.middle_value,
          });
        }
        if (row.right_label && row.right_value) {
          array.push({
            id: `row${index + 1}-right`,
            header: row.right_label,
            body: row.right_value,
          });
        }
        return array;
      });
      // we are creating a 2d matrix to a flat array.
      let cardDetailsRow: TextModuleData[] = rows.flat();

      let detailsRows: TextModuleData[] = payload.details.map(
        (detail, index) => {
          return {
            id: `detail-${index + 1}`,
            header: detail.title,
            body: detail.body,
          };
        }
      );

      let textModulesData: TextModuleData[] = [
        ...cardDetailsRow,
        ...detailsRows,
      ];
      // mapping the request payload to wallet api payload
      genericObject = {
        id: objectId,
        classId: classId,
        logo: {
          sourceUri: {
            uri: payload.logoUrl,
          },
          contentDescription: {
            defaultValue: {
              language: "en-US",
              value: "LOGO_IMAGE_DESCRIPTION",
            },
          },
        },
        cardTitle: {
          defaultValue: {
            language: "en-US",
            value: payload.title,
          },
        },
        subheader: {
          defaultValue: {
            language: "en-US",
            value: payload.subheader,
          },
        },
        header: {
          defaultValue: {
            language: "en-US",
            value: payload.header,
          },
        },
        textModulesData,
        barcode: payload.barcode.isEnable
          ? {
              type: BarcodeTypeEnum.QR_CODE,
              value: payload.barcode.value,
              alternateText: payload.barcode.alternateText,
            }
          : undefined,
        hexBackgroundColor: payload.hexaBackground,
        heroImage: {
          sourceUri: {
            uri: payload.heroImageUrl,
          },
          contentDescription: {
            defaultValue: {
              language: "en-US",
              value: "HERO_IMAGE_DESCRIPTION",
            },
          },
        },
        imageModulesData: [],
      };
      genericObject = await generic.createObject(genericObject);
      console.log("Object created Successfully");
    } else {
      console.log("Object Already exist");
    }

    const claims = {
      iss: client_email,
      aud: "google",
      origins: [],
      typ: "savetowallet",
      payload: {
        genericObjects: [genericObject],
      },
    };

    const token = jwt.sign(claims, private_key, {
      algorithm: "RS256",
    });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
    return { saveUrl, passId: payload.id };
  } catch (error) {
    console.log({ error });
    throw error;
  }
};
