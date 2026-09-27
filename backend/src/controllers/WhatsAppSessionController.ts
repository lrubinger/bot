import { Request, Response } from "express";
import { getWbot, removeWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // Evita duas sessoes simultaneas para a mesma conexao.
  await removeWbot(whatsapp.id, false);

  await whatsapp.update({
    status: "OPENING",
    qrcode: "",
    retries: 0
  });

  // Start in background: the socket promise resolves only after WhatsApp connects.
  // The HTTP request must return immediately so the frontend can poll the QR code.
  void StartWhatsAppSession(whatsapp, companyId);

  return res.status(202).json({ message: "Starting session.", status: "OPENING" });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const current = await ShowWhatsAppService(whatsappId, companyId);

  // Encerra qualquer socket antigo antes de limpar e recriar a sessao.
  await removeWbot(current.id, false);

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    companyId,
    whatsappData: {
      session: "",
      status: "OPENING"
    }
  });

  await whatsapp.update({
    qrcode: "",
    retries: 0
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

  try {
    const wbot = getWbot(whatsapp.id);
    try {
      await wbot.logout();
    } catch (_) {}
  } catch (_) {}

  await removeWbot(whatsapp.id, false);

  await whatsapp.update({
    status: "DISCONNECTED",
    session: "",
    qrcode: "",
    retries: 0
  });

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
