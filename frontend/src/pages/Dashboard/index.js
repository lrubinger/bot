import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography
} from "@material-ui/core";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import TableChartIcon from "@material-ui/icons/TableChart";

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        PortoPlan Bot — ambiente de teste
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        MVP liberado para validação do fluxo principal. Os módulos ainda não validados permanecem visíveis no menu como pendentes.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <CheckCircleOutlineIcon color="primary" />
              <Typography variant="h6">Backend</Typography>
              <Chip label="Operacional" size="small" color="primary" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <WhatsAppIcon color="primary" />
              <Typography variant="h6">WhatsApp</Typography>
              <Chip label="Em validação" size="small" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <TableChartIcon color="primary" />
              <Typography variant="h6">Kanban</Typography>
              <Chip label="Em validação" size="small" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <HourglassEmptyIcon color="disabled" />
              <Typography variant="h6">Demais módulos</Typography>
              <Chip label="Pendente" size="small" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
