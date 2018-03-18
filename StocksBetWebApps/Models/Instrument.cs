using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;

namespace StocksBetWebApps.Models
{
    public class Instrument
    {
        public string Code;
        public string CompanyName;
        public string Exchange;
        public string Industry;
        public string Website;
        public string Description;
        public string CEO;
        public string IssueType;
        public string Sector;
        public string LogoUrl;

        public Instrument()
        {

        }

        public List<Instrument> GetList()
        {
            var result = new List<Instrument>();

            var conString = ConfigurationSettings.AppSettings["ConnectionString"].ToString();
            using (SqlConnection connection = new SqlConnection(conString))
            {
                connection.Open();

                string sql = @"
                SELECT TOP 200 
                    [code],
                    companyName,
                    logoUrl,
                    sector,
                    industry
                FROM [importIEX].[dbo].[instruments]
                ";

                using (SqlCommand command = new SqlCommand(sql, connection))
                {
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new Instrument()
                            {
                                Code = reader["code"].ToString(),
                                CompanyName = reader["companyName"].ToString(),
                                LogoUrl = reader["logoUrl"].ToString(),
                                Sector = reader["sector"].ToString(),
                                Industry = reader["industry"].ToString()
                            });
                        }
                    }
                }
            }

            return result;
        }

        public Instrument(string code)
        {
            var conString = ConfigurationSettings.AppSettings["ConnectionString"].ToString();
            using (SqlConnection connection = new SqlConnection(conString))
            {
                connection.Open();

                string sql = @"
                SELECT 
                    [code],
                    companyName,
                    exchange,
                    industry,
                    website,
                    [description],
                    CEO,
                    issueType,
                    sector,
                    logoUrl
                FROM [importIEX].[dbo].[instruments]
                WHERE [code] = @code
                ";

                using (SqlCommand command = new SqlCommand(sql, connection))
                {
                    command.Parameters.Add("@code", SqlDbType.VarChar).Value = code;

                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            Code = reader["code"].ToString();
                            CompanyName = reader["companyName"].ToString();
                            Exchange = reader["exchange"].ToString();
                            Industry = reader["industry"].ToString();
                            Website = reader["website"].ToString();
                            Description = reader["description"].ToString();
                            CEO = reader["CEO"].ToString();
                            IssueType = reader["issueType"].ToString();
                            Sector = reader["sector"].ToString();
                            LogoUrl = reader["logoUrl"].ToString();
                        }
                    }
                }
            }
        }


        //public Instrument GetInstrument(string code)
        //{
        //    var result = new Instrument();



        //    return result;
        //}
    }
}