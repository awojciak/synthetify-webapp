import { makeStyles, createStyles, Theme } from '@material-ui/core/styles'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    background: {
      minHeight: '100%',
      minWidth: '100%',
      position: 'relative',
      background: '#030313',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    },
    content: {
      // marginLeft: 400,
      position: 'absolute',
      width: '100%',
      paddingLeft: 100,
      [theme.breakpoints.up('md')]: {
        paddingLeft: 400
      },
      // top: 100,
      overflowX: 'hidden'
    },
    contentContainer: {
      width: '100%'
    },
    contentWrapper: {
      width: '100%',
      maxWidth: 1300
    },
    side: {
      zIndex: 100,
      // width: 400,
      overflow: 'hidden',
      position: 'fixed',
      height: '100%'
    }
  })
)
export default useStyles
