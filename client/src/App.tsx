import React, { useState } from "react";
import useMaintenanceNotice from "./useMaintenanceNotice";
import { MaintenanceNoticeType } from "maintenance-notice";

import { AppBar, Badge, Button, Card, CardContent, CardHeader, IconButton, makeStyles, Slide, Toolbar, Typography } from "@material-ui/core";
import { Alert } from '@material-ui/lab';
import CloseIcon             from '@material-ui/icons/Close';
import NotificationsIcon     from '@material-ui/icons/Notifications';
import NotificationsNoneIcon from '@material-ui/icons/NotificationsNone';

// 通知リスト表示コンポーネント
type MaintenanceNoticeAlertProps = {
  notices: MaintenanceNoticeType[],
  onClose: () => void
}
const MaintenanceNoticeAlerts: React.FC<MaintenanceNoticeAlertProps> = ({notices, onClose}) => {
  return (
    <Card>
      <CardHeader
        title="通知"
        action={
          <IconButton onClick={_ => onClose()} color="primary" aria-label="upload picture" component="span">
            <CloseIcon />
          </IconButton>
        }
      />
      <CardContent>
        {notices.map((notice, idx) => {
          const date = notice.date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
          return (
            <Alert key={idx} style={{marginBottom: 10}} severity="warning"><span style={{fontSize: '60%'}}>{date} </span> — <span>{notice.message}</span></Alert>
          );
        })}
      </CardContent>
    </Card>
  )
}

// 通知アイコン
type NotificationsBellIconProps = {
  notices: MaintenanceNoticeType[],
  socketError: boolean
}
const NotificationsBellIcon: React.FC<NotificationsBellIconProps> = ({socketError, notices}) => {
  if (socketError) {
    return <NotificationsIcon color="error" />;
  } else if (notices.length === 0) {
    return <NotificationsNoneIcon />;
  } else {
    return <NotificationsIcon />;
  }
};


const App = () => {
  const {notices, socketError} = useMaintenanceNotice();
  const [showNotice, setShowNotice] = useState(false);

  const useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
    },
    work: {
      margin: 10
    }
  }));

  const classes = useStyles();

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Apps
          </Typography>
          <IconButton onClick={_ => setShowNotice(!showNotice)} color="inherit">
            <Badge badgeContent={notices.length} color="secondary">
              <NotificationsBellIcon notices={notices} socketError={socketError} />
            </Badge>
          </IconButton>
          <Button color="inherit">Logout</Button>
        </Toolbar>
      </AppBar>
      <div className={classes.work}>
        {socketError ?
          <Alert severity="error">通知サーバーまたはネットワークに問題が発生しています</Alert> :
          <Slide direction="up" in={showNotice && notices.length > 0} mountOnEnter unmountOnExit>
            <div>
              <MaintenanceNoticeAlerts notices={notices} onClose={() => setShowNotice(false)}/>
            </div>
          </Slide>
        }
      </div>
    </div>
  )
}

export default App;