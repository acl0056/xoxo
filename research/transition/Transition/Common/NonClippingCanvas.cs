using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;

namespace Easycoustics.Transition.Common
{
    public class NonClippingCanvas : Canvas
    {
        private static void Clip(FrameworkElement element)
        {
            var clip = new RectangleGeometry { Rect = new Rect(0, 0, element.ActualWidth, element.ActualHeight) };
            element.Clip = clip;
        }


        public NonClippingCanvas()
        {
            this.Loaded += (s, e) => Clip(this);
            this.SizeChanged += (s, e) => Clip(this);
        }
    }
}
