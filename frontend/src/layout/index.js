import React, { useContext, useEffect, useState } from "react";
import clsx from "clsx";
import {
  AppBar,
  Divider,
  Drawer,
  IconButton,
  List,
  makeStyles,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";

import MainListItems from "./MainListItems";
import { AuthContext } from "../context/Auth/AuthContext";


const drawerWidth = 250;

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: theme.palette.background.default
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"])
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`
  },
  toolbar: {
    minHeight: 48
  },
  menuButton: {
    marginRight: theme.spacing(2)
  },
  title: {
    flexGrow: 1,
    minWidth: 0
  },
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth
  },
  drawerClosed: {
    overflowX: "hidden",
    width: theme.spacing(7)
  },
  logoArea: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(0, 1)
  },
  logo: {
    maxWidth: 165,
    maxHeight: 38
  },
  content: {
    flexGrow: 1,
    minWidth: 0,
    padding: theme.spacing(2),
    marginTop: 48
  },
  menuList: {
    overflowY: "auto",
    flexGrow: 1
  }
}));

const LoggedInLayout = ({ children }) => {
  const classes = useStyles();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, handleLogout, loading } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(!mobile);

  useEffect(() => {
    setDrawerOpen(!mobile);
  }, [mobile]);

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando...</div>;
  }

  return (
    <div className={classes.root}>
      <Drawer
        variant={mobile ? "temporary" : "permanent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        classes={{
          paper: clsx(classes.drawerPaper, !drawerOpen && !mobile && classes.drawerClosed)
        }}
      >
        <div className={classes.logoArea}>
          {drawerOpen && <Typography variant="subtitle1">PortoPlan Bot</Typography>}
          <IconButton onClick={() => setDrawerOpen(false)}>
            <ChevronLeftIcon />
          </IconButton>
        </div>
        <Divider />
        <List className={classes.menuList}>
          <MainListItems
            drawerClose={() => mobile && setDrawerOpen(false)}
            collapsed={!drawerOpen}
          />
        </List>
      </Drawer>

      <AppBar
        position="fixed"
        className={clsx(classes.appBar, drawerOpen && !mobile && classes.appBarShift)}
      >
        <Toolbar variant="dense" className={classes.toolbar}>
          {!drawerOpen && (
            <IconButton
              edge="start"
              color="inherit"
              className={classes.menuButton}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="subtitle1" noWrap className={classes.title}>
            PortoPlan Bot — ambiente de teste
            {user?.name ? ` · ${user.name}` : ""}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} title="Sair">
            <ExitToAppIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <main className={classes.content}>{children}</main>
    </div>
  );
};

export default LoggedInLayout;
