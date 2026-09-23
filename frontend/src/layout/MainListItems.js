import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Chip,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader
} from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import TableChartIcon from "@material-ui/icons/TableChart";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import EventIcon from "@material-ui/icons/Event";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import ForumIcon from "@material-ui/icons/Forum";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import AnnouncementIcon from "@material-ui/icons/Announcement";
import DeviceHubOutlinedIcon from "@material-ui/icons/DeviceHubOutlined";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import CodeRoundedIcon from "@material-ui/icons/CodeRounded";
import LocalAtmIcon from "@material-ui/icons/LocalAtm";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import BorderColorIcon from "@material-ui/icons/BorderColor";

function ListItemLink({ icon, primary, to }) {
  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button dense component={renderLink}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}

function PendingItem({ icon, primary }) {
  return (
    <ListItem dense disabled title="Pendente de validação">
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={primary} />
      <Chip label="Pendente" size="small" variant="outlined" />
    </ListItem>
  );
}

const MainListItems = ({ drawerClose, collapsed }) => (
  <div onClick={drawerClose}>
    <ListSubheader
      hidden={collapsed}
      disableSticky
      style={{ fontWeight: 700, lineHeight: "32px" }}
    >
      MVP em teste
    </ListSubheader>

    <ListItemLink to="/" primary="Dashboard" icon={<DashboardOutlinedIcon />} />
    <ListItemLink to="/tickets" primary="Atendimentos" icon={<WhatsAppIcon />} />
    <ListItemLink to="/kanban" primary="Kanban" icon={<TableChartIcon />} />
    <ListItemLink to="/contacts" primary="Contatos" icon={<ContactPhoneOutlinedIcon />} />
    <ListItemLink to="/connections" primary="Conexões WhatsApp" icon={<SyncAltIcon />} />
    <ListItemLink to="/queues" primary="Filas" icon={<AccountTreeOutlinedIcon />} />
    <ListItemLink to="/users" primary="Usuários" icon={<PeopleAltOutlinedIcon />} />

    <Divider style={{ margin: "8px 0" }} />
    <ListSubheader
      hidden={collapsed}
      disableSticky
      style={{ fontWeight: 700, lineHeight: "32px" }}
    >
      Próximas etapas
    </ListSubheader>

    <PendingItem primary="Mensagens rápidas" icon={<FlashOnIcon />} />
    <PendingItem primary="Tarefas" icon={<BorderColorIcon />} />
    <PendingItem primary="Agendamentos" icon={<EventIcon />} />
    <PendingItem primary="Tags" icon={<LocalOfferIcon />} />
    <PendingItem primary="Chat interno" icon={<ForumIcon />} />
    <PendingItem primary="Ajuda" icon={<HelpOutlineIcon />} />
    <PendingItem primary="Campanhas" icon={<EventAvailableIcon />} />
    <PendingItem primary="Avisos" icon={<AnnouncementIcon />} />
    <PendingItem primary="Integrações" icon={<DeviceHubOutlinedIcon />} />
    <PendingItem primary="Arquivos" icon={<AttachFileIcon />} />
    <PendingItem primary="API externa" icon={<CodeRoundedIcon />} />
    <PendingItem primary="Financeiro" icon={<LocalAtmIcon />} />
    <PendingItem primary="Configurações avançadas" icon={<SettingsOutlinedIcon />} />
  </div>
);

export default MainListItems;
