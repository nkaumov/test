import express from 'express'
import session from 'express-session'
import pool from '../database/db.js'
import moment from 'moment';
import Handlebars from 'handlebars';


//import { myFunction } from '../database/db-function.js';




const app = express()

app.use(session({
  secret: 'your-unique-and-hard-to-guess-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // change to true when using HTTPS
}))

app.set('view engine', 'hbs');



app.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user,
  });
});

app.get('/log', (req, res) => {
  res.render('log', {
    title: 'login',
  })
});

app.get('/reg', (req, res) => {
  res.render('reg', {
    title: 'registration',
  })
});

app.use(express.urlencoded({ extended: true }))

app.post('/log', async (req, res) => {
  const {username, password } = req.body;
  console.log(username, password)
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  
  if (rows.length > 0) {
    const user = rows[0];

    if (password === user.password) {
      req.session.userId = user.id; // сохраняем userId в сессии
      req.session.user = user; // сохраняем всего пользователя в сессии
      res.redirect('/');
    } else {
      res.send('Неверный пароль');
    }
  } else {
    res.send('Пользователь с таким username не найден');
  }
});

app.post('/register', async (req, res) => {
  const {username, password } = req.body;

  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  if (rows.length > 0) {
    res.send('Пользователь с таким username уже существует');
  } else {
    await pool.execute('INSERT INTO users (username, password, admin) VALUES (?, ?, ?)', [username, password, 0]);
    res.redirect('/log');
  }
});


  app.get('/index-admin', (req, res) => {
    if (req.session.user && req.session.user.admin) {
      res.render('index-admin', {
        title: 'Admin Panel',
        user: req.session.user,
      });
    } else {
      res.redirect('/log');
    }
  });

  app.get('/adminOrders', async (req, res) => {
    if(req.session.user && req.session.user.admin) {
      const [rows] = await pool.execute('SELECT * FROM Orders');
    
      const orders = rows.map(row => {
        return {
          OrderID: row.OrderID,
          ProductName: row.ProductName,
          Quantity: row.Quantity,
          URL: row.URL,
          StartDate: row.StartDate,
          EndDate: row.EndDate,
          Author: row.Author,
          Status: row.Status
          
        };
      });
    
      res.render('adminOrders', { title: 'Admin Orders', user: req.session.user, orders });
    } else {
      res.redirect('/log');
    }
});

app.post('/orders/new', async (req, res) => {
  if(req.session.user && req.session.user.admin) {
    const [rows, fields] = await pool.execute(
      'SELECT * FROM Orders WHERE Status = ?',
      ['На рассмотрении']
    );
    // Отправьте заказы обратно на клиент или рендерите страницу с заказами
    res.render('adminOrders', { orders: rows });
  } else {
    res.status(403).send('Доступ запрещен');
  }
});

app.post('/orders/processing', async (req, res) => {
  if(req.session.user && req.session.user.admin) {
    const [rows, fields] = await pool.execute(
      'SELECT * FROM Orders WHERE Status = ?',
      ['Закупаем']
    );
    // Отправьте заказы обратно на клиент или рендерите страницу с заказами
    res.render('adminOrders', { orders: rows });
  } else {
    res.status(403).send('Доступ запрещен');
  }
});

app.post('/orders/completed', async (req, res) => {
  if(req.session.user && req.session.user.admin) {
    const [rows, fields] = await pool.execute(
      'SELECT * FROM Orders WHERE Status = ?',
      ['Ждем']
    );
    // Отправьте заказы обратно на клиент или рендерите страницу с заказами
    res.render('adminOrders', { orders: rows });
  } else {
    res.status(403).send('Доступ запрещен');
  }
});

app.post('/orders/canceled', async (req, res) => {
  if(req.session.user && req.session.user.admin) {
    const [rows, fields] = await pool.execute(
      'SELECT * FROM Orders WHERE Status = ?',
      ['Забрать']
    );
    // Отправьте заказы обратно на клиент или рендерите страницу с заказами
    res.render('adminOrders', { orders: rows });
  } else {
    res.status(403).send('Доступ запрещен');
  }
});


app.post('/updateOrderStatus', async (req, res) => {
  if(req.session.user && req.session.user.admin) {
    const { OrderID, newStatus } = req.body;

    await pool.execute(
      'UPDATE Orders SET Status = ? WHERE OrderID = ?',
      [newStatus, OrderID]
    );

    res.redirect('/adminOrders')
  } else {
    res.status(403).send('Доступ запрещен');
  }
});


  app.get('/order-user', (req, res) => {
    if(req.session.user && req.session.user) {
      res.render('order-user', {
        title: 'orders',
        user: req.session.user,
      });
    } else {
      res.redirect('/log'); // changed from '/login' to '/log'
    }
  });

 

  Handlebars.registerHelper('dateFormat', function(value) {
        return moment(value).format('DD/MM');
  });

  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  app.get('/myOrder', async (req, res) => {
    if(req.session.user) {
      const userId = req.session.user.id;
    
      const [rows] = await pool.execute(
        'SELECT * FROM Orders WHERE UserID = ?',
        [userId]
      );
    
      // Преобразование каждой строки результата в объект
      const orders = rows.map(row => {
        return {
          OrderID: row.OrderID,
          ProductName: row.ProductName,
          Quantity: row.Quantity,
          URL: row.URL,
          StartDate: row.StartDate,
          EndDate: row.EndDate,
          Author: row.Author,
          Status: row.Status
        };
      });
    
      res.render('myOrder', { title: 'orders', user: req.session.user, orders });
    } else {
      res.redirect('/log');
    }
  });
  



app.post('/submit-order', async (req, res) => {
  const order = req.body;

  // Получение userId из сессии
  const userId = req.session.userId;
  
  // if (userId) {
  //   await pool.execute(
  //     'INSERT INTO Orders (ProductName, Quantity, URL, StartDate, EndDate, Author, Status, userId) VALUES (?, ?, ?, ?, ?, ?, "На рассмотрении", ?)',
  //     [order.ProductName, order.quantity, order.url, order.startDate, order.endDate, order.author, userId].map(param => {
  //       if (typeof param === 'undefined') {
  //         return null;
  //       }
  //       return param;
  //     })
  //   );
  //   console.log('Заказ успешно отправлен!')
  //   res.json({ message: 'Заказ успешно отправлен!' });
  // } else {
  //   res.status(400).json({ error: 'Ошибка: userId не определен' });
  // }
  // Предположим, что переменная userId должна быть определена ранее в коде

// Проверяем наличие значения userId
if (userId) {
  await pool.execute(
    'INSERT INTO Orders (ProductName, Quantity, URL, StartDate, EndDate, Author, Status, userId) VALUES (?, ?, ?, ?, ?, ?, "На рассмотрении", ?)',
    [order.ProductName, order.quantity, order.url, order.startDate, order.endDate, order.author, userId].map(param => {
      if (typeof param === 'undefined') {
        return null;
      }
      return param;
    })
  );
  console.log('Заказ успешно отправлен!');
  res.json({ message: 'Заказ успешно отправлен!' });
} else {
  res.status(400).json({ error: 'Ошибка: userId не определен' });
}


});


  app.get('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.redirect('/');
      }
    
      res.clearCookie('connect.sid'); // changed from 'sid' to 'connect.sid'
      res.redirect('/log');
    });
  });

  
export default app;