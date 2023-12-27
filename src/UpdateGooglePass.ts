import { GoogleAuthOptions } from "google-auth-library";
import { PassPayload } from "./types";
import {
  BarcodeTypeEnum,
  GenericClient,
  StateEnum,
  TextModuleData,
} from "./Generic";

export const updateGooglePass = async (
  objectId: string,
  payload: PassPayload,
  credentials: GoogleAuthOptions["credentials"],
  ISSUER_ID: string,
  private_key: string,
  client_email: string
) => {
  try {
    const generic = new GenericClient(credentials);
    let objectSuffix = `${objectId.replace(/[^\w.-]/g, "_")}`;
    let genericObject = await generic.getObject(ISSUER_ID, objectSuffix);

    if (!genericObject) {
      throw "Pass doesn't exist";
    }

    // genericObject.state = StateEnum.INACTIVE;
    genericObject.notifications = undefined;
    genericObject.validTimeInterval = undefined;

    // checking each property and updating it accordingly
    if (payload.logoUrl && genericObject.logo && genericObject.logo.sourceUri) {
      genericObject.logo.sourceUri.uri = payload.logoUrl;
    }
    if (
      payload.title &&
      genericObject.cardTitle &&
      genericObject.cardTitle.defaultValue
    ) {
      genericObject.cardTitle.defaultValue.value = payload.title;
    }
    if (
      payload.subheader &&
      genericObject.subheader &&
      genericObject.subheader.defaultValue
    ) {
      genericObject.subheader.defaultValue.value = payload.subheader;
    }
    if (payload.header && genericObject.header.defaultValue) {
      genericObject.header.defaultValue.value = payload.header;
    }
    if (payload.hexaBackground) {
      genericObject.hexBackgroundColor = payload.hexaBackground;
    }
    if (
      payload.heroImageUrl &&
      genericObject.heroImage &&
      genericObject.heroImage.sourceUri
    ) {
      genericObject.heroImage.sourceUri.uri = payload.heroImageUrl;
    }
    if (payload.barcode) {
      genericObject.barcode = {
        type: BarcodeTypeEnum.QR_CODE,
        value: payload.barcode.value,
        alternateText: payload.barcode.alternateText,
      };
    }

    if (payload.details) {
      let detailsRows: TextModuleData[] = payload.details.map(
        (detail, index) => {
          return {
            id: `detail-${index + 1}`,
            header: detail.title,
            body: detail.body,
          };
        }
      );
      if (genericObject.textModulesData) {
        let newTextModuleData = genericObject.textModulesData.filter(
          (data) => data.id && data.id.includes("row")
        );
        genericObject.textModulesData = [...newTextModuleData, ...detailsRows];
      }
    }

    if (payload.rows) {
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
      if (genericObject.textModulesData) {
        let newTextModuleData = genericObject.textModulesData.filter(
          (data) => data.id && data.id.includes("detail")
        );

        genericObject.textModulesData = [
          ...cardDetailsRow,
          ...newTextModuleData,
        ];
      }
    }

    genericObject = await generic.updateObject(genericObject);
    console.log("object Updated", genericObject.validTimeInterval);

    // return genericObject;

    // Here we are updating the time to send the update notification

    setTimeout(async () => {
      try {
        if (genericObject) {
          console.log("I am executed", genericObject.id);

          genericObject.notifications = {
            upcomingNotification: {
              enableNotification: true,
            },
          };

          genericObject.state = StateEnum.ACTIVE;

          const currentDate = new Date();
          const tomorrow = new Date(currentDate);
          tomorrow.setDate(currentDate.getDate() + 1);

          genericObject.validTimeInterval = {
            start: {
              date: tomorrow.toISOString(),
            },
          };

          genericObject = await generic.updateObject(genericObject);
        }
      } catch (error) {
        console.log(error);
      }
    }, 30000);

    return genericObject;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
