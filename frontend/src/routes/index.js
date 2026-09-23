import React from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard";
import TicketResponsiveContainer from "../pages/TicketResponsiveContainer";
import Login from "../pages/Login";
import Connections from "../pages/Connections";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts";
import Queues from "../pages/Queues";
import Kanban from "../pages/Kanban";
import { AuthProvider } from "../context/Auth/AuthContext";
import { TicketsContextProvider } from "../context/Tickets/TicketsContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import Route from "./Route";

const Routes = () => (
  <BrowserRouter>
    <AuthProvider>
      <TicketsContextProvider>
        <Switch>
          <Route exact path="/login" component={Login} />
          <WhatsAppsProvider>
            <LoggedInLayout>
              <Route exact path="/" component={Dashboard} isPrivate />
              <Route exact path="/tickets/:ticketId?" component={TicketResponsiveContainer} isPrivate />
              <Route exact path="/connections" component={Connections} isPrivate />
              <Route exact path="/contacts" component={Contacts} isPrivate />
              <Route exact path="/queues" component={Queues} isPrivate />
              <Route exact path="/users" component={Users} isPrivate />
              <Route exact path="/kanban" component={Kanban} isPrivate />
            </LoggedInLayout>
          </WhatsAppsProvider>
        </Switch>
        <ToastContainer autoClose={3000} />
      </TicketsContextProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default Routes;
