using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.Common
{
    public struct Point2D
    {
        public double X { get; }
        public double Y { get; }

        public static readonly Point2D Origin = new Point2D(0, 0);
        
        public Point2D(double x, double y)
        {
            X = x;
            Y = y;
        }

        public static bool operator ==(Point2D left, Point2D right)
        {
            return left.Equals(right);
        }

        public static bool operator !=(Point2D left, Point2D right)
        {
            return !left.Equals(right);
        }

        public override bool Equals(object obj)
        {
            return ((obj is Point2D) && Equals((Point2D)obj));
        }

        public bool Equals(Point2D other)
        {
            return (other.X == this.X) && (other.Y == this.Y);
        }

        public override int GetHashCode()
        {
            return base.GetHashCode();
        }

        public static Point2D Add(Point2D n1, Point2D n2) => new Point2D(n1.X + n2.X, n1.Y + n2.Y);
        public static Point2D Substract(Point2D n1, Point2D n2) => new Point2D(n1.X - n2.X, n1.Y - n2.Y);
        public static Point2D Negate(Point2D n) => new Point2D(n.X * -1, n.Y * -1);
        public static Point2D NegateX(Point2D n) => new Point2D(n.X * -1, n.Y);
        public static Point2D NegateY(Point2D n) => new Point2D(n.X, n.Y * -1);
        public static Point2D Multiply(Point2D n1, double n2) => new Point2D(n1.X * n2, n1.Y * n2);
        

        public static Point2D AngleShift(Point2D n1, double angle)
        {
            double originalAngle = getAngleFromOrigin(n1);
            double magnitude = getDistanceOrigin(n1);
            double shiftedAngle = originalAngle + angle;

            return new Point2D(Math.Cos(shiftedAngle) * magnitude,
                               Math.Sin(shiftedAngle) * magnitude);

        }

        public static Point2D operator +(Point2D n1, Point2D n2) { return Add(n1, n2); }
        public static Point2D operator -(Point2D n1, Point2D n2) { return Substract(n1, n2); }
        public static Point2D operator *(Point2D n1, double n2) { return Multiply(n1, n2); }
        public static Point2D operator *(double n1, Point2D n2) { return Multiply(n2, n1); }


        public static double getDistance(Point2D point1, Point2D point2)
        {
            return Math.Sqrt(Math.Pow(point1.X - point2.X, 2) +
                             Math.Pow(point1.Y - point2.Y, 2));
        }

        public double getDistance(Point2D otherPoint) => getDistance(this, otherPoint);

        public static double getDistanceOrigin(Point2D n1) => getDistance(n1, new Point2D(0, 0));
        public double getDistanceOrigin() => getDistance(this, new Point2D(0, 0));

        public static double getAngleFromOrigin(Point2D point)
        {
            return Math.Atan2(point.Y, point.X);
        }

    
        public double getAngleFromOrigin()
        {
            return getAngleFromOrigin(this);
        }

        public override string ToString()
        {
            string output;
            
            output = "Point" + Environment.NewLine;
            output += "X: " + X.ToString() + Environment.NewLine;
            output += "Y: " + Y.ToString() + Environment.NewLine;

            return output;


        }

    }
}
