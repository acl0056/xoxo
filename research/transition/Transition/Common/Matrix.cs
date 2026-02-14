using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.Common
{
    public class Matrix : ICloneable, IEquatable<Matrix>
    {
        public ComplexDecimal[,] Data { get; }

        public int QuantityOfRows => Data.GetLength(0);
        public int QuantityOfColumns => Data.GetLength(1);

        public bool IsSquare => QuantityOfColumns == QuantityOfRows;

        public Matrix(int QuantityOfRows, int QuantityOfColumns)
        {
            if (QuantityOfRows < 1) throw new InvalidOperationException("Quantity of Rows must be greater or equal than 1");
            if (QuantityOfColumns < 1) throw new InvalidOperationException("Quantity of Columns must be greater or equal than 1");

            Data = new ComplexDecimal[QuantityOfRows, QuantityOfColumns];
        }

        public Matrix(int QuantityOfRowsAndColumns)
        {
            if (QuantityOfRowsAndColumns < 1) throw new InvalidOperationException("Quantity of Rows/Columns must be greater or equal than 1");

            Data = new ComplexDecimal[QuantityOfRowsAndColumns, QuantityOfRowsAndColumns];
        }

        public void Clear()
        {
            for (int x = 0; x < QuantityOfRows; x++)
                for (int y = 0; y < QuantityOfColumns; y++)
                    Data[x, y] = 0m;
        }

        public void Multiply(ComplexDecimal value)
        {
            for (int x = 0; x < QuantityOfRows; x++)
                for (int y = 0; y < QuantityOfColumns; y++)
                    Data[x, y] *= value;
        }

        public static Matrix Multiply(Matrix m, ComplexDecimal value)
        {
            Matrix output = (Matrix)m.Clone();

            for (int x = 0; x < m.QuantityOfRows; x++)
                for (int y = 0; y < m.QuantityOfColumns; y++)
                    output.Data[x, y] *= value;

            return output;
        }

        public void Add(ComplexDecimal value)
        {
            for (int x = 0; x < QuantityOfRows; x++)
                for (int y = 0; y < QuantityOfColumns; y++)
                    Data[x, y] += value;
        }

        public static Matrix Add(Matrix m, ComplexDecimal value)
        {
            Matrix output = (Matrix)m.Clone();
            
            for (int x = 0; x < m.QuantityOfRows; x++)
                for (int y = 0; y < m.QuantityOfColumns; y++)
                    output.Data[x, y] += value;

            return output;
        }

        public void addAtCoordinate(int row, int column, ComplexDecimal quantity)
        {
            Data[row, column] += quantity;
        }

        public void addAtCoordinate1(int row, int column, ComplexDecimal quantity)
        {
            addAtCoordinate(row - 1, column - 1, quantity);
        }

        public static Matrix Substract(Matrix m, ComplexDecimal value)
        {
            Matrix output = (Matrix)m.Clone();

            for (int x = 0; x < m.QuantityOfRows; x++)
                for (int y = 0; y < m.QuantityOfColumns; y++)
                    output.Data[x, y] -= value;

            return output;
        }


        public static Matrix Divide(Matrix m, ComplexDecimal value)
        {
            Matrix output = (Matrix)m.Clone();

            for (int x = 0; x < m.QuantityOfRows; x++)
                for (int y = 0; y < m.QuantityOfColumns; y++)
                    output.Data[x, y] /= value;

            return output;
        }

        public void Add(Matrix other)
        {
            if (QuantityOfRows != other.QuantityOfRows) throw new InvalidOperationException("The two matrixes have different numbers of rows. They are not sum compatible");
            if (QuantityOfColumns != other.QuantityOfColumns) throw new InvalidOperationException("The two matrixes have different numbers of columns. They are not sum compatible");

            for (int x = 0; x < other.QuantityOfRows; x++)
                for (int y = 0; y < other.QuantityOfColumns; y++)
                    Data[x, y] += other.Data[x, y];
        }

        public static Matrix Add(Matrix m1, Matrix m2)
        {
            if (m1.QuantityOfRows != m2.QuantityOfRows) throw new InvalidOperationException("The two matrixes have different numbers of rows. They are not sum compatible");
            if (m1.QuantityOfColumns != m2.QuantityOfColumns) throw new InvalidOperationException("The two matrixes have different numbers of columns. They are not sum compatible");

            Matrix output = (Matrix)m1.Clone();

            for (int x = 0; x < m1.QuantityOfRows; x++)
                for (int y = 0; y < m1.QuantityOfColumns; y++)
                    output.Data[x, y] += m2.Data[x, y];

            return output;
        }

        public Matrix Multiply(Matrix other)
        {
            if (QuantityOfColumns != other.QuantityOfRows)
                throw new InvalidOperationException("Matrix multiplication requires that columns of matrix A and rows of matrix B are equal number.");

            var output = new Matrix(QuantityOfRows, other.QuantityOfColumns);

            int a = QuantityOfRows;
            int b = other.QuantityOfColumns;
            int c = QuantityOfColumns;

            for (int x = 0; x <= a; x++)
                for (int y = 0; y <= b; y++)
                    for (int z = 0; z <= c; z++)
                        output.Data[x, y] += Data[x, z] * other.Data[z, y];

            return output;
        }

        public static Matrix Multiply(Matrix m1, Matrix m2)
        {
            if (m1.QuantityOfColumns != m2.QuantityOfRows)
                    throw new InvalidOperationException("Matrix multiplication requires that columns of matrix A and rows of matrix B are equal number.");

            var output = new Matrix(m1.QuantityOfRows, m2.QuantityOfColumns);

            int a = m1.QuantityOfRows;
            int b = m2.QuantityOfColumns;
            int c = m1.QuantityOfColumns;

            for (int x = 0; x <= a; x++)
                for (int y = 0; y <= b; y++)
                    for (int z = 0; z <= c; z++)
                        output.Data[x, y] += m1.Data[x, z] * m2.Data[z, y];

            return output;
        }

        public Matrix Solve(Matrix bVector)
        {
            //LU

            if (!IsSquare) throw new InvalidOperationException("Matrix non square");
            
            /* A * X = B 
               where A is this matrix
               B is provided as parameter, it is the vector of the right side of the equality or equation
               X is the vector with values of the unknown X variables 
            */

            if (bVector.QuantityOfColumns != 1) throw new InvalidOperationException("B Matrix must have one column");
            if (bVector.QuantityOfRows != QuantityOfRows) throw new InvalidOperationException("B vector do not have equal number of rows as coefficient Matrix");

            var L = new Matrix(QuantityOfRows);
            var U = new Matrix(QuantityOfRows);

            var Z = new Matrix(QuantityOfRows, 1);
            var X = new Matrix(QuantityOfRows, 1);

            int n = QuantityOfRows;

            /* Doolittle factorization, obtaining LU Matrixes */
            for (int k = 0; k <= (n - 1); k++)
            {
                L.Data[k, k] = 1;
                for (int j = k; j <= (n - 1); j++)
                {
                    U.Data[k, j] = Data[k, j];
                    for (int s = 0; s <= (k - 1); s++)
                        U.Data[k, j] -= L.Data[k, s] * U.Data[s, j];
                }
                for (int i = k + 1; i <= (n - 1); i++)
                {
                    L.Data[i, k] = Data[i, k];
                    for (int s = 0; s <= (k - 1); s++)
                        L.Data[i, k] -= L.Data[i, s] * U.Data[s, k];

                    L.Data[i, k] /= U.Data[k, k];
                }
            }

            /* 
              Ax = B
              A = LU
              LUx = B
              then
              Lz = B
              Ux = z
              
              now we get with Z and X vectors 
              with 2nd phase of Gauss Jordan
            */
             
            /* getting the Z vector */

            Z.Data[0, 0] = bVector.Data[0, 0];

            for (int i = 1; i <= (n - 1); i++)
            {
                Z.Data[i, 0] = bVector.Data[i, 0];
                for (int j = 0; j <= (i - 1); j++)
                    Z.Data[i, 0] -= L.Data[i, j] * Z.Data[j, 0];
            }
            
            /* and finally the X vector */
            X.Data[n - 1, 0] = Z.Data[n - 1, 0] / U.Data[n - 1, n - 1];

            for (int i = n - 2; i >= 0; i--)
            {
                X.Data[i, 0] = Z.Data[i, 0];
                for (int j = i + 1; j <= (n - 1); j++)
                    X.Data[i, 0] -= U.Data[i, j] * X.Data[j, 0];
                X.Data[i, 0] /= U.Data[i, i];
            }

            /* and thank you Ward Cheney and David Kincaid
             * for your wonderful book of Numeric Methods
               Sixth Edition !*/

            return X;
        }

        public override string ToString()
        {
            string output = "";

            for (int x = 0; x < QuantityOfRows; x++)
            {
                for (int y = 0; y < QuantityOfColumns; y++)
                {
                    output += Data[x, y].ToString();
                    if (y < (QuantityOfColumns - 1))
                        output += " , ";
                    else
                        output += " || ";
                }
                output += Environment.NewLine;
            }

            return output;

        }

        public object Clone()
        {
            var output = new Matrix(QuantityOfRows, QuantityOfColumns);

            for (int x = 0; x < QuantityOfRows; x++)
                for (int y = 0; y < QuantityOfColumns; y++)
                    output.Data[x, y] = Data[x, y];

            return output;
        }

        public override bool Equals(object other)
        {
            if (!(other is Matrix)) return false;

            var other2 = (Matrix)other;

            return Equals(other2);

        }

        public override int GetHashCode()
        {
            var hashCode = 1484588367;
            hashCode = hashCode * -1521134295 + EqualityComparer<ComplexDecimal[,]>.Default.GetHashCode(Data);
            hashCode = hashCode * -1521134295 + QuantityOfRows.GetHashCode();
            hashCode = hashCode * -1521134295 + QuantityOfColumns.GetHashCode();
            hashCode = hashCode * -1521134295 + IsSquare.GetHashCode();
            return hashCode;
        }

        public bool Equals(Matrix other)
        {
            if (QuantityOfRows != other.QuantityOfRows) return false;
            if (QuantityOfColumns != other.QuantityOfColumns) return false;

            for (int x = 0; x < QuantityOfRows; x++)
                for (int y = 0; y < QuantityOfColumns; y++)
                    if (Data[x, y] != other.Data[x, y]) return false;

            return true;
        }

        public static bool operator ==(Matrix m1, Matrix m2) { return m1.Equals(m2); }
        public static bool operator !=(Matrix m1, Matrix m2) { return !m1.Equals(m2); }
        
        public static Matrix operator +(Matrix n1, ComplexDecimal n2) { return Add(n1, n2); }
        public static Matrix operator -(Matrix n1, ComplexDecimal n2) { return Substract(n1, n2); }
        public static Matrix operator *(Matrix n1, ComplexDecimal n2) { return Multiply(n1, n2); }
        public static Matrix operator /(Matrix n1, ComplexDecimal n2) { return Divide(n1, n2); }

        public static Matrix operator +(ComplexDecimal n1, Matrix n2) { return Add(n2, n1); }
        public static Matrix operator *(ComplexDecimal n1, Matrix n2) { return Multiply(n2, n1); }
        public static Matrix operator -(ComplexDecimal n1, Matrix n2) { return Add(-1 * n2, n1); }

        public static Matrix operator +(Matrix m1, Matrix m2) { return Add(m1, m2); }
        public static Matrix operator -(Matrix m1, Matrix m2) { return Add(m1, -1 * m2); }
        public static Matrix operator *(Matrix m1, Matrix m2) { return Multiply(m1, m2); }


    }
}
