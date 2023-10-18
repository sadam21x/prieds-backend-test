var express = require('express');
var router = express.Router();
const stock_read_log = require('../models/stock_read_log');
const FileSystem = require("fs");

router.use('/export-data', async (req, res) => {
  const list = await stock_read_log.aggregate([
    {
      $match: {}
    }
  ]).exec();
  
  FileSystem.writeFile('./stock_read_log.json', JSON.stringify(list), (error) => {
      if (error) throw error;
  });

  console.log('stock_read_log.json exported!');
  res.json({statusCode: 1, message: 'stock_read_log.json exported!'})
});

router.use('/import-data', async (req, res) => {
  const list = await stock_read_log.aggregate([
    {
      $match: {}
    }
  ]).exec();
  
  FileSystem.readFile('./stock_read_log.json', async (error, data) => {
      if (error) throw error;

      const list = JSON.parse(data);

      const deletedAll = await stock_read_log.deleteMany({});

      const insertedAll = await stock_read_log.insertMany(list);

      console.log('stock_read_log.json imported!');
  res.json({statusCode: 1, message: 'stock_read_log.json imported!'})
  });

  
})

router.use('/edit-repacking-data', async (req, res) => {
  try {
    const { company_id, payload, reject_qr_list, new_qr_list } = req.body;

    if (!company_id || !payload) {
      throw new Error('Missing required fields');
    }

    const lastRecord = await stock_read_log.findOne({ company_id, payload }).sort({ created_time: -1 }).exec();

    if (!lastRecord) {
      throw new Error('No record found');
    }

    let newQrList = lastRecord.qr_list;

    if (Array.isArray(reject_qr_list) && reject_qr_list.length > 0) {
      let rejectPayloadList = reject_qr_list.map(qr => qr.payload);
      newQrList = newQrList.filter(qr => !rejectPayloadList.includes(qr.payload));
    }

    if (Array.isArray(new_qr_list) && new_qr_list.length > 0) {
      let newPayloadList = new_qr_list.map(qr => qr.payload);
      let newQrData = await stock_read_log.find({ company_id, payload: { $in: newPayloadList } }).exec();

      newQrList = newQrList.concat(newQrData);
    }

    await stock_read_log.updateOne(
      { _id: lastRecord._id },
      { $set: {
          qr_list: newQrList,
          status_repacking: 1,
          last_updated: new Date(),
        }
      }
    );

    res.status(200).json({
      statusCode: 1,
      message: 'Success'
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 0,
      message: error?.message || 'Something went wrong'
    });
  }
})

router.use('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
