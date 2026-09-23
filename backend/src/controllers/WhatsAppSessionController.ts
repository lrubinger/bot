import { Request, Response } from "express";
import { getWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // Start in background: the socket promise resolves only after WhatsApp connects.
  // The HTTP request must return immediately so the frontend can poll the QR code.
  void StartWhatsAppSession(whatsapp, companyId);

  return res.status(202).json({ message: "Starting session.", status: "OPENING" });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    companyId,
    whatsappData: { session: "" }
  });

  // Start in background for the same reason as store(): QR generation happens
  // before the socket promise resolves, so do not block the HTTP response.
  void StartWhatsAppSession(whatsapp, companyId);

  return res.status(202).json({ message: "Starting session.", status: "OPENING" });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  if (whatsapp.session) {
    await whatsapp.update({ status: "DISCONNECTED", session: "" });
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
