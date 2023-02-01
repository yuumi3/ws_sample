"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonToMaintenanceNotice = exports.maintenanceNoticeToJSon = void 0;
const maintenanceNoticeToJSon = (date, message, command) => {
    return JSON.stringify({ date, message, command });
};
exports.maintenanceNoticeToJSon = maintenanceNoticeToJSon;
const jsonToMaintenanceNotice = (json) => {
    try {
        const obj = JSON.parse(json);
        return { ...obj, date: new Date(obj.date) };
    }
    catch (err) {
        console.log("JSON error ", err);
        return { date: new Date(), message: "" };
    }
};
exports.jsonToMaintenanceNotice = jsonToMaintenanceNotice;
